"""Execution and grading helpers for practice code runs."""

from __future__ import annotations

import ast
import asyncio
import json
import logging
import os
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from server.llm.client import completion_json

logger = logging.getLogger(__name__)

RESULTS_START_MARKER = "__MYTHICCODE_RESULTS_START__"
RESULTS_END_MARKER = "__MYTHICCODE_RESULTS_END__"
SUPPORTED_LANGUAGES = {"javascript", "python"}
MAX_OUTPUT_CHARS = 16_000


@dataclass
class StructuredTestCase:
    args: list[Any]
    expected: Any
    hidden: bool = False


class TestCaseResult:
    def __init__(self, passed: bool, input_data: str, expected: str, actual: str, is_hidden: bool = False):
        self.passed = passed
        self.input = input_data
        self.expected = expected
        self.actual = actual
        self.is_hidden = is_hidden

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "input": self.input,
            "expected": self.expected,
            "actual": self.actual,
            "is_hidden": self.is_hidden,
        }


class ExecutionResult:
    def __init__(
        self,
        stdout: str,
        stderr: str,
        exit_code: int,
        execution_time_ms: int,
        test_results: list[TestCaseResult],
    ):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.execution_time_ms = execution_time_ms
        self.test_results = test_results

    def to_dict(self) -> dict[str, Any]:
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "execution_time_ms": self.execution_time_ms,
            "test_results": [result.to_dict() for result in self.test_results],
        }


class EvaluationResult:
    def __init__(self, feedback: str, hints: list[str], score: int, passed: bool):
        self.feedback = feedback
        self.hints = hints
        self.score = score
        self.passed = passed

    def to_dict(self) -> dict[str, Any]:
        return {
            "feedback": self.feedback,
            "hints": self.hints,
            "score": self.score,
            "passed": self.passed,
        }


BLOCKED_PATTERNS = {
    "python": [
        r"\bimport\s+os\b",
        r"\bimport\s+subprocess\b",
        r"\b__import__\s*\(",
        r"\bopen\s*\(",
        r"\bexec\s*\(",
        r"\beval\s*\(",
        r"\bcompile\s*\(",
    ],
    "javascript": [
        r"\brequire\s*\(\s*['\"]fs['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]child_process['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]http['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]https['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]net['\"]\s*\)",
        r"\beval\s*\(",
        r"\bFunction\s*\(",
    ],
}


def _runtime_root() -> Path:
    root = Path(__file__).resolve().parents[1] / ".runtime" / "practice-exec"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _truncate_output(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return f"{text[:MAX_OUTPUT_CHARS]}\n...[output truncated]..."


def _check_security(code: str, language: str) -> Optional[str]:
    for pattern in BLOCKED_PATTERNS.get(language, []):
        if re.search(pattern, code, re.IGNORECASE):
            return f"Security precheck blocked pattern '{pattern}'"
    return None


def infer_entrypoint_name(code: str, language: str) -> str | None:
    patterns = (
        [
            r"function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(",
            r"const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(",
            r"(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(",
        ]
        if language == "javascript"
        else [r"def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("]
    )
    for pattern in patterns:
        match = re.search(pattern, code)
        if match:
            return match.group(1)
    return None


def _parse_json_or_literal(raw_value: str) -> Any:
    raw_value = raw_value.strip()
    try:
        return json.loads(raw_value)
    except Exception:
        pass
    try:
        return ast.literal_eval(raw_value)
    except Exception:
        return raw_value


def _parse_input_arguments(raw_input: str) -> list[Any]:
    raw_input = raw_input.strip()
    if not raw_input:
        return []

    candidates = [f"[{raw_input}]", raw_input]
    for candidate in candidates:
        try:
            value = json.loads(candidate)
            return value if isinstance(value, list) else [value]
        except Exception:
            pass
        try:
            value = ast.literal_eval(candidate)
            if isinstance(value, tuple):
                return list(value)
            return value if isinstance(value, list) else [value]
        except Exception:
            pass
    return [raw_input]


def normalize_legacy_test_cases(test_cases: list[dict[str, Any]]) -> list[StructuredTestCase]:
    normalized: list[StructuredTestCase] = []
    for test_case in test_cases:
        normalized.append(
            StructuredTestCase(
                args=_parse_input_arguments(str(test_case.get("input", ""))),
                expected=_parse_json_or_literal(str(test_case.get("expected_output", ""))),
                hidden=bool(test_case.get("is_hidden") or test_case.get("hidden")),
            )
        )
    return normalized


def structured_test_to_display(test_case: dict[str, Any]) -> dict[str, Any]:
    return {
        "input": ", ".join(_display_value(arg) for arg in test_case.get("args", [])),
        "expected_output": _display_value(test_case.get("expected")),
        "is_hidden": bool(test_case.get("hidden", False)),
    }


def _display_value(value: Any) -> str:
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    except Exception:
        return str(value)


def _parse_harness_stdout(stdout: str) -> tuple[str, list[TestCaseResult]]:
    start_index = stdout.find(RESULTS_START_MARKER)
    end_index = stdout.find(RESULTS_END_MARKER)
    if start_index == -1 or end_index == -1 or end_index < start_index:
        return _truncate_output(stdout), []

    payload = stdout[start_index + len(RESULTS_START_MARKER) : end_index].strip()
    user_stdout = _truncate_output(f"{stdout[:start_index]}{stdout[end_index + len(RESULTS_END_MARKER):]}".strip("\n"))

    try:
        parsed = json.loads(payload)
    except Exception:
        return user_stdout, []

    results = [
        TestCaseResult(
            passed=bool(item.get("passed")),
            input_data=str(item.get("input", "")),
            expected=str(item.get("expected", "")),
            actual=str(item.get("actual", "")),
            is_hidden=bool(item.get("is_hidden", False)),
        )
        for item in parsed.get("results", [])
    ]
    return user_stdout, results


def _build_javascript_harness(code: str, entrypoint_name: str, test_cases: list[StructuredTestCase]) -> str:
    tests_payload = json.dumps(
        [{"args": test.args, "expected": test.expected, "hidden": test.hidden} for test in test_cases],
        ensure_ascii=False,
    )
    return f"""{code}

(async () => {{
  const __tests = {tests_payload};
  const __entrypoint = typeof {entrypoint_name} !== "undefined" ? {entrypoint_name} : undefined;
  const __stringify = (value) => {{
    try {{ return JSON.stringify(value); }} catch (_error) {{ return String(value); }}
  }};
  const __results = [];
  if (typeof __entrypoint !== "function") {{
    __results.push({{ passed: false, input: "", expected: "", actual: "Entrypoint '{entrypoint_name}' is not defined.", is_hidden: false }});
  }} else {{
    for (const __test of __tests) {{
      const __args = Array.isArray(__test.args) ? __test.args : [__test.args];
      try {{
        let __actual = __entrypoint(...__args);
        if (__actual && typeof __actual.then === "function") {{
          __actual = await __actual;
        }}
        __results.push({{
          passed: JSON.stringify(__actual) === JSON.stringify(__test.expected),
          input: __stringify(__args),
          expected: __stringify(__test.expected),
          actual: __stringify(__actual),
          is_hidden: !!__test.hidden,
        }});
      }} catch (__error) {{
        __results.push({{
          passed: false,
          input: __stringify(__args),
          expected: __stringify(__test.expected),
          actual: (__error && (__error.stack || __error.message)) ? (__error.stack || __error.message) : String(__error),
          is_hidden: !!__test.hidden,
        }});
      }}
    }}
  }}
  console.log("{RESULTS_START_MARKER}");
  console.log(JSON.stringify({{ results: __results }}));
  console.log("{RESULTS_END_MARKER}");
}})().catch((__error) => {{
  console.error(__error && (__error.stack || __error.message) ? (__error.stack || __error.message) : String(__error));
  process.exitCode = 1;
}});
"""


def _build_python_harness(code: str, entrypoint_name: str, test_cases: list[StructuredTestCase]) -> str:
    tests_payload = json.dumps(
        [{"args": test.args, "expected": test.expected, "hidden": test.hidden} for test in test_cases],
        ensure_ascii=False,
    )
    return f"""{code}

import json as __json
__tests = __json.loads(r'''{tests_payload}''')
__results = []

def __stringify(value):
    try:
        return __json.dumps(value, ensure_ascii=False, sort_keys=True)
    except Exception:
        return repr(value)

__entrypoint = globals().get("{entrypoint_name}")
if not callable(__entrypoint):
    __results.append({{"passed": False, "input": "", "expected": "", "actual": "Entrypoint '{entrypoint_name}' is not defined.", "is_hidden": False}})
else:
    for __test in __tests:
        __args = __test.get("args", [])
        if not isinstance(__args, list):
            __args = [__args]
        try:
            __actual = __entrypoint(*__args)
            __results.append({{
                "passed": __stringify(__actual) == __stringify(__test.get("expected")),
                "input": __stringify(__args),
                "expected": __stringify(__test.get("expected")),
                "actual": __stringify(__actual),
                "is_hidden": bool(__test.get("hidden", False)),
            }})
        except Exception as __error:
            __results.append({{
                "passed": False,
                "input": __stringify(__args),
                "expected": __stringify(__test.get("expected")),
                "actual": str(__error),
                "is_hidden": bool(__test.get("hidden", False)),
            }})

print("{RESULTS_START_MARKER}")
print(__json.dumps({{"results": __results}}, ensure_ascii=False))
print("{RESULTS_END_MARKER}")
"""


class LocalExecutionProvider:
    """Development execution provider. This is not a hardened sandbox."""

    def __init__(self) -> None:
        self.runtime_root = _runtime_root()

    def _resolve_runtime(self, language: str) -> str:
        if language == "python":
            return sys.executable
        node_path = shutil.which("node")
        if not node_path:
            raise RuntimeError("Node.js runtime is not available on PATH for JavaScript execution.")
        return node_path

    async def execute(
        self,
        code: str,
        language: str,
        entrypoint_name: str | None = None,
        test_cases: list[StructuredTestCase] | None = None,
        timeout_seconds: int = 5,
    ) -> ExecutionResult:
        import time

        start_time = time.time()
        test_cases = test_cases or []

        if language not in SUPPORTED_LANGUAGES:
            return ExecutionResult("", f"Unsupported language: {language}", 1, 0, [])

        security_error = _check_security(code, language)
        if security_error:
            return ExecutionResult("", security_error, 1, 0, [])

        runtime = self._resolve_runtime(language)
        entrypoint = entrypoint_name or infer_entrypoint_name(code, language)
        if test_cases and not entrypoint:
            return ExecutionResult("", "Could not determine the function entrypoint for structured tests.", 1, 0, [])

        full_code = (
            _build_javascript_harness(code, entrypoint, test_cases)
            if test_cases and language == "javascript"
            else _build_python_harness(code, entrypoint, test_cases)
            if test_cases and language == "python"
            else code
        )

        temp_dir_cm: tempfile.TemporaryDirectory[str] | None = None
        cwd: str | None = None
        if language == "javascript":
            temp_dir_cm = tempfile.TemporaryDirectory(dir=self.runtime_root)
            cwd = temp_dir_cm.name
            script_path = Path(cwd) / "submission.js"
            script_path.write_text(full_code, encoding="utf-8")
            cmd = [runtime, "--max-old-space-size=64", str(script_path)]
        else:
            cmd = [runtime, "-c", full_code]

        env = {"PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf-8"}

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=env,
            )
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
                raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
                stderr = _truncate_output(stderr_bytes.decode("utf-8", errors="replace"))
                exit_code = process.returncode
            except asyncio.TimeoutError:
                process.kill()
                raw_stdout = ""
                stderr = f"Execution timed out after {timeout_seconds} seconds"
                exit_code = 124

            stdout, results = _parse_harness_stdout(raw_stdout) if test_cases else (_truncate_output(raw_stdout), [])
            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                exit_code=exit_code,
                execution_time_ms=int((time.time() - start_time) * 1000),
                test_results=results,
            )
        except Exception as exc:
            logger.error("Code execution failed: %s", str(exc))
            return ExecutionResult("", f"Execution error: {str(exc)}", 1, int((time.time() - start_time) * 1000), [])
        finally:
            if temp_dir_cm is not None:
                temp_dir_cm.cleanup()


_EXECUTION_PROVIDER = LocalExecutionProvider()


async def execute_code(
    code: str,
    language: str,
    test_cases: list[dict[str, Any]],
    entrypoint_name: str | None = None,
    timeout_seconds: int = 5,
) -> ExecutionResult:
    return await _EXECUTION_PROVIDER.execute(
        code=code,
        language=language,
        entrypoint_name=entrypoint_name,
        test_cases=normalize_legacy_test_cases(test_cases),
        timeout_seconds=timeout_seconds,
    )


async def execute_structured_code(
    code: str,
    language: str,
    entrypoint_name: str,
    test_cases: list[StructuredTestCase],
    timeout_seconds: int = 5,
) -> ExecutionResult:
    return await _EXECUTION_PROVIDER.execute(
        code=code,
        language=language,
        entrypoint_name=entrypoint_name,
        test_cases=test_cases,
        timeout_seconds=timeout_seconds,
    )


async def evaluate_solution(
    code: str,
    language: str,
    challenge_description: str,
    test_results: list[TestCaseResult],
) -> EvaluationResult:
    passed_count = sum(1 for result in test_results if result.passed)
    test_score = int((passed_count / len(test_results)) * 100) if test_results else 0
    test_summary = "\n".join(
        f"Test {index + 1}: {'PASS' if result.passed else 'FAIL'} - Input: {result.input}, Expected: {result.expected}, Got: {result.actual}"
        for index, result in enumerate(test_results)
    )

    result = await completion_json(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a code evaluation assistant. Analyze the submitted code against the "
                    "challenge requirements and test results. Respond in JSON with keys feedback, hints, score, and passed."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Challenge: {challenge_description}\n\n"
                    f"Language: {language}\n\n"
                    f"Submitted Code:\n```\n{code}\n```\n\n"
                    f"Test Results:\n{test_summary}\n\n"
                    f"Base score from tests: {test_score}/100\n"
                ),
            },
        ],
        temperature=0.3,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )

    hints = result.get("hints", [])
    score = max(0, min(100, int(result.get("score", test_score))))
    return EvaluationResult(
        feedback=result.get("feedback", "No feedback provided."),
        hints=hints if isinstance(hints, list) else [str(hints)],
        score=score,
        passed=bool(result.get("passed", score >= 70)),
    )
