"""Local Codex CLI broker for personal-use AI features."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import subprocess
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from server.config import REPO_ROOT, get_settings
from server.errors import AIConfigurationError, AIExecutionError

logger = logging.getLogger(__name__)

OutputKind = Literal["json_object", "json_array", "text"]


@dataclass(slots=True)
class CodexJob:
    prompt: str
    output_kind: OutputKind
    timeout_seconds: int
    retry_count: int
    correlation_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    model: str | None = None


@dataclass(slots=True)
class CodexProcessResult:
    stdout: str
    stderr: str
    exit_code: int
    final_output: str


def _broker_runtime_dir() -> Path:
    root = REPO_ROOT / ".runtime" / "codex-broker"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _truncate(text: str, limit: int = 600) -> str:
    compact = text.strip()
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit].rstrip()}..."


def _json_wrapper(prompt: str, output_kind: OutputKind) -> str:
    shape = "a JSON object" if output_kind == "json_object" else "a JSON array"
    return (
        "Return only valid JSON.\n"
        f"The final answer must be {shape}.\n"
        "Do not wrap the JSON in markdown fences.\n"
        "Do not add commentary before or after the JSON.\n"
        'If you cannot complete the request, return {"error":"...","reason":"..."}.\n\n'
        f"{prompt.strip()}\n"
    )


def build_prompt_payload(prompt: str, output_kind: OutputKind) -> str:
    if output_kind == "text":
        return prompt.strip()
    return _json_wrapper(prompt, output_kind)


def extract_json_payload(text: str, output_kind: OutputKind) -> Any:
    decoder = json.JSONDecoder()

    stripped = text.strip()
    if stripped:
        try:
            parsed = json.loads(stripped)
            _validate_output_kind(parsed, output_kind)
            return parsed
        except json.JSONDecodeError:
            pass

    for fence in ("```json", "```JSON", "```"):
        index = text.rfind(fence)
        if index != -1:
            block_start = index + len(fence)
            block_end = text.find("```", block_start)
            if block_end != -1:
                candidate = text[block_start:block_end].strip()
                if candidate:
                    try:
                        parsed = json.loads(candidate)
                        _validate_output_kind(parsed, output_kind)
                        return parsed
                    except json.JSONDecodeError:
                        pass

    last_match: Any | None = None
    for index, char in enumerate(text):
        if char not in "{[":
            continue
        try:
            parsed, _end = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        try:
            _validate_output_kind(parsed, output_kind)
        except ValueError:
            continue
        last_match = parsed

    if last_match is None:
        raise ValueError("No valid JSON payload found in Codex output.")
    return last_match


def _validate_output_kind(payload: Any, output_kind: OutputKind) -> None:
    if output_kind == "json_object" and not isinstance(payload, dict):
        raise ValueError("Expected a JSON object from Codex.")
    if output_kind == "json_array" and not isinstance(payload, list):
        raise ValueError("Expected a JSON array from Codex.")


class CodexRunner:
    """Knows how to invoke the local Codex CLI and parse its output."""

    def __init__(self) -> None:
        self.last_error: str | None = None

    def resolve_executable(self) -> str:
        settings = get_settings()
        executable = (settings.CODEX_EXECUTABLE or "").strip()
        if not executable:
            raise AIConfigurationError(
                "Local Codex is not configured. Set CODEX_EXECUTABLE to the codex command or full path."
            )

        candidate = Path(executable)
        if candidate.is_absolute():
            if not candidate.exists():
                raise AIConfigurationError(
                    f"Local Codex is not configured. CODEX_EXECUTABLE was not found at {candidate}."
                )
            return str(candidate)

        # On Windows, app execution aliases like `codex` can be invokable from the
        # shell even when the resolved WindowsApps target cannot be launched
        # directly by Python subprocesses. Keep the original command token for
        # execution and use `which` only as a best-effort presence check.
        if not shutil.which(executable):
            raise AIConfigurationError(
                f"Local Codex is not configured. Could not find '{executable}' on PATH."
            )
        return executable

    async def run(self, job: CodexJob) -> Any:
        prompt_file = self._write_prompt_file(job)
        try:
            last_stdout = ""
            last_stderr = ""
            for attempt in range(job.retry_count + 1):
                process_result = await self._run_process(job, prompt_file)
                last_stdout = process_result.final_output or process_result.stdout
                last_stderr = process_result.stderr

                if process_result.exit_code != 0:
                    logger.error(
                        "Codex job %s failed with exit_code=%s stderr=%s stdout=%s",
                        job.correlation_id,
                        process_result.exit_code,
                        _truncate(process_result.stderr),
                        _truncate(process_result.stdout),
                    )
                    self.last_error = (
                        f"Codex exited with code {process_result.exit_code}: "
                        f"{_truncate(process_result.stderr or process_result.stdout)}"
                    )
                    raise AIExecutionError(
                        "Local Codex is unavailable or returned invalid output.",
                        details={
                            "exit_code": process_result.exit_code,
                            "stderr": _truncate(process_result.stderr),
                            "stdout": _truncate(process_result.stdout),
                            "job_id": job.correlation_id,
                        },
                    )

                if job.output_kind == "text":
                    self.last_error = None
                    return (process_result.final_output or process_result.stdout).strip()

                try:
                    payload = extract_json_payload(
                        process_result.final_output or process_result.stdout,
                        job.output_kind,
                    )
                    self.last_error = None
                    return payload
                except ValueError as exc:
                    logger.warning(
                        "Codex JSON extraction failed for job %s attempt %s/%s: %s",
                        job.correlation_id,
                        attempt + 1,
                        job.retry_count + 1,
                        exc,
                    )
                    if attempt >= job.retry_count:
                        self.last_error = str(exc)
                        raise AIExecutionError(
                            "Local Codex is unavailable or returned invalid output.",
                            details={
                                "stderr": _truncate(last_stderr),
                                "stdout": _truncate(last_stdout),
                                "job_id": job.correlation_id,
                            },
                        ) from exc

            raise AIExecutionError("Local Codex is unavailable or returned invalid output.")
        finally:
            prompt_file.unlink(missing_ok=True)

    def health_snapshot(self) -> dict[str, Any]:
        settings = get_settings()
        executable = (settings.CODEX_EXECUTABLE or "").strip()
        resolved = None
        if executable:
            candidate = Path(executable)
            resolved = str(candidate.resolve()) if candidate.is_absolute() else shutil.which(executable)
        return {
            "backend": settings.AI_BACKEND,
            "configured_executable": executable or None,
            "resolved_executable": resolved,
            "last_runner_error": self.last_error,
        }

    def _write_prompt_file(self, job: CodexJob) -> Path:
        runtime_dir = _broker_runtime_dir()
        payload = build_prompt_payload(job.prompt, job.output_kind)
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".md",
            prefix=f"{job.correlation_id}-",
            dir=runtime_dir,
            delete=False,
        ) as handle:
            handle.write(payload)
            return Path(handle.name)

    async def _run_process(self, job: CodexJob, prompt_file: Path) -> CodexProcessResult:
        settings = get_settings()
        executable = self.resolve_executable()
        output_file = self._create_output_file(job)
        prompt = (
            "Read the full task from this file and return only the final answer requested there:\n"
            f"{prompt_file}\n"
            "Do not mention the file path in your answer."
        )

        command, stdin_payload = self._build_process_command(
            executable=executable,
            workdir=settings.CODEX_WORKDIR,
            output_file=output_file,
            prompt=prompt,
            model=job.model,
        )

        try:
            completed = await asyncio.to_thread(
                subprocess.run,
                command,
                input=stdin_payload,
                capture_output=True,
                text=False,
                cwd=settings.CODEX_WORKDIR,
                timeout=job.timeout_seconds,
                check=False,
            )
        except FileNotFoundError as exc:
            raise AIConfigurationError(
                f"Local Codex is not configured. Could not find '{settings.CODEX_EXECUTABLE}' on PATH."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            output_file.unlink(missing_ok=True)
            raise AIExecutionError(
                "Local Codex is unavailable or returned invalid output.",
                details={
                    "job_id": job.correlation_id,
                    "stderr": f"Timed out after {job.timeout_seconds} seconds",
                    "stdout": _truncate(_decode_process_output(exc.stdout)),
                },
            ) from exc
        except OSError as exc:
            raise AIExecutionError(
                "Local Codex is unavailable or returned invalid output.",
                details={"job_id": job.correlation_id, "stderr": str(exc)},
            ) from exc

        stdout = _decode_process_output(completed.stdout)
        stderr = _decode_process_output(completed.stderr)
        final_output = ""
        try:
            if output_file.exists():
                final_output = output_file.read_text(encoding="utf-8", errors="replace")
        finally:
            output_file.unlink(missing_ok=True)

        if job.model and completed.returncode != 0 and _looks_like_model_issue(stderr, stdout):
            logger.info(
                "Retrying Codex job %s without --model flag after model-related failure. stderr=%s stdout=%s",
                job.correlation_id,
                _truncate(stderr),
                _truncate(stdout),
            )
            job_without_model = CodexJob(
                prompt=job.prompt,
                output_kind=job.output_kind,
                timeout_seconds=job.timeout_seconds,
                retry_count=job.retry_count,
                correlation_id=job.correlation_id,
                model=None,
            )
            return await self._run_process(job_without_model, prompt_file)

        return CodexProcessResult(
            stdout=stdout,
            stderr=stderr,
            exit_code=completed.returncode,
            final_output=final_output,
        )

    def _build_process_command(
        self,
        *,
        executable: str,
        workdir: str,
        output_file: Path,
        prompt: str,
        model: str | None,
    ) -> tuple[list[str], str | None]:
        direct_command = [
            executable,
            "exec",
            "--full-auto",
            "--sandbox",
            "workspace-write",
            "--cd",
            workdir,
            "--color",
            "never",
            "--output-last-message",
            str(output_file),
        ]
        if model:
            direct_command.extend(["--model", model])
        direct_command.append("-")

        # Windows app execution aliases can work in PowerShell while failing when
        # launched directly via CreateProcess. Route bare command names through
        # PowerShell so backend jobs behave like the manual shell test.
        if os.name == "nt" and not Path(executable).is_absolute():
            executable_literal = self._ps_quote(executable)
            workdir_literal = self._ps_quote(workdir)
            output_literal = self._ps_quote(str(output_file))
            model_segment = f" --model {self._ps_quote(model)}" if model else ""
            ps_command = [
                "powershell.exe",
                "-NoProfile",
                "-Command",
                (
                    f"& {executable_literal} exec --full-auto --sandbox workspace-write "
                    f"--cd {workdir_literal} --color never --output-last-message {output_literal}"
                    f"{model_segment} -"
                ),
            ]
            return ps_command, prompt

        return direct_command, prompt

    def _ps_quote(self, value: str | None) -> str:
        if value is None:
            return "''"
        return "'" + value.replace("'", "''") + "'"


def _decode_process_output(raw: bytes | str | None) -> str:
    if raw is None:
        return ""
    if isinstance(raw, str):
        return raw
    return raw.decode("utf-8", errors="replace")

    def _create_output_file(self, job: CodexJob) -> Path:
        runtime_dir = _broker_runtime_dir()
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".out",
            prefix=f"{job.correlation_id}-",
            dir=runtime_dir,
            delete=False,
        ) as handle:
            return Path(handle.name)


def _looks_like_model_issue(stderr: str, stdout: str = "") -> bool:
    lowered = f"{stderr}\n{stdout}".lower()
    if "--model" in lowered and any(
        token in lowered for token in ("unknown", "unexpected", "unrecognized", "invalid")
    ):
        return True
    if "model" not in lowered:
        return False
    return any(
        token in lowered
        for token in (
            "unsupported",
            "not available",
            "unavailable",
            "not found",
            "does not exist",
            "no access",
            "permission",
        )
    )


@dataclass(slots=True)
class _QueuedJob:
    job: CodexJob
    future: asyncio.Future[Any]


class CodexQueue:
    """Single-worker FIFO queue for local Codex jobs."""

    def __init__(self, runner: CodexRunner | None = None, maxsize: int | None = None) -> None:
        settings = get_settings()
        self.runner = runner or CodexRunner()
        self.maxsize = maxsize if maxsize is not None else settings.CODEX_QUEUE_MAXSIZE
        self._queue: asyncio.Queue[_QueuedJob] = asyncio.Queue(maxsize=self.maxsize)
        self._worker_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if self._worker_task and not self._worker_task.done():
            return
        self.runner.resolve_executable()
        self._worker_task = asyncio.create_task(self._worker(), name="codex-cli-worker")

    async def stop(self) -> None:
        worker = self._worker_task
        if worker is None:
            return
        worker.cancel()
        try:
            await worker
        except asyncio.CancelledError:
            pass
        self._worker_task = None

    async def submit(self, job: CodexJob) -> Any:
        await self.start()
        if self._queue.full():
            raise AIExecutionError(
                "Codex queue is full. Please wait for the current job to finish."
            )
        loop = asyncio.get_running_loop()
        future: asyncio.Future[Any] = loop.create_future()
        await self._queue.put(_QueuedJob(job=job, future=future))
        return await future

    def health_snapshot(self) -> dict[str, Any]:
        snapshot = self.runner.health_snapshot()
        snapshot.update(
            {
                "queue_length": self._queue.qsize(),
                "worker_running": bool(self._worker_task and not self._worker_task.done()),
            }
        )
        return snapshot

    async def _worker(self) -> None:
        while True:
            queued = await self._queue.get()
            try:
                result = await self.runner.run(queued.job)
                if not queued.future.done():
                    queued.future.set_result(result)
            except Exception as exc:
                if not queued.future.done():
                    queued.future.set_exception(exc)
            finally:
                self._queue.task_done()


_CODEX_QUEUE: CodexQueue | None = None


def get_codex_queue() -> CodexQueue:
    global _CODEX_QUEUE
    if _CODEX_QUEUE is None:
        _CODEX_QUEUE = CodexQueue()
    return _CODEX_QUEUE


async def start_codex_queue() -> dict[str, Any]:
    queue = get_codex_queue()
    await queue.start()
    return queue.health_snapshot()


async def stop_codex_queue() -> None:
    global _CODEX_QUEUE
    if _CODEX_QUEUE is None:
        return
    await _CODEX_QUEUE.stop()
    _CODEX_QUEUE = None


def get_codex_health() -> dict[str, Any]:
    return get_codex_queue().health_snapshot()
