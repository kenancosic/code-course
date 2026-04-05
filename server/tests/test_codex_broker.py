from __future__ import annotations

import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock

from server.config import Settings
from server.errors import AIExecutionError
from server.llm.codex_broker import (
    CodexJob,
    CodexProcessResult,
    CodexQueue,
    CodexRunner,
    extract_json_payload,
)


class CodexBrokerTests(unittest.IsolatedAsyncioTestCase):
    def test_extract_json_payload_handles_plain_json(self) -> None:
        payload = extract_json_payload('{"title":"Quest"}', "json_object")
        self.assertEqual(payload["title"], "Quest")

    def test_extract_json_payload_handles_fenced_json(self) -> None:
        payload = extract_json_payload("```json\n[{\"title\":\"Quest\"}]\n```", "json_array")
        self.assertEqual(payload[0]["title"], "Quest")

    def test_extract_json_payload_handles_noisy_stdout(self) -> None:
        payload = extract_json_payload('thinking...\n{"status":"ok"}\nall done', "json_object")
        self.assertEqual(payload["status"], "ok")

    async def test_queue_processes_jobs_fifo(self) -> None:
        order: list[str] = []

        class FakeRunner:
            last_error = None

            def resolve_executable(self) -> str:
                return "codex"

            def health_snapshot(self) -> dict:
                return {"backend": "codex_cli"}

            async def run(self, job: CodexJob) -> str:
                order.append(job.correlation_id)
                await asyncio.sleep(0.01)
                return job.prompt

        queue = CodexQueue(runner=FakeRunner(), maxsize=4)
        job_one = CodexJob("first", "text", 5, 0)
        job_two = CodexJob("second", "text", 5, 0)
        try:
            results = await asyncio.gather(queue.submit(job_one), queue.submit(job_two))
        finally:
            await queue.stop()

        self.assertEqual(results, ["first", "second"])
        self.assertEqual(order, [job_one.correlation_id, job_two.correlation_id])

    async def test_queue_surfaces_runner_errors(self) -> None:
        class ExplodingRunner:
            last_error = "boom"

            def resolve_executable(self) -> str:
                return "codex"

            def health_snapshot(self) -> dict:
                return {"backend": "codex_cli", "last_runner_error": self.last_error}

            async def run(self, _job: CodexJob) -> str:
                raise AIExecutionError("Local Codex is unavailable or returned invalid output.")

        queue = CodexQueue(runner=ExplodingRunner(), maxsize=2)
        try:
            with self.assertRaises(AIExecutionError):
                await queue.submit(CodexJob("boom", "text", 5, 0))
        finally:
            await queue.stop()

    async def test_runner_retries_malformed_json(self) -> None:
        runner = CodexRunner()
        runner.resolve_executable = Mock(return_value="codex")
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".md", delete=False) as handle:
            prompt_path = Path(handle.name)

        runner._write_prompt_file = Mock(return_value=prompt_path)
        runner._run_process = AsyncMock(
            side_effect=[
                CodexProcessResult(stdout="not json", stderr="", exit_code=0, final_output="not json"),
                CodexProcessResult(stdout='{"ok":true}', stderr="", exit_code=0, final_output='{"ok":true}'),
            ]
        )

        result = await runner.run(CodexJob("prompt", "json_object", 5, 1))
        self.assertEqual(result, {"ok": True})
        self.assertEqual(runner._run_process.await_count, 2)

    async def test_runner_stops_after_retry_limit(self) -> None:
        runner = CodexRunner()
        runner.resolve_executable = Mock(return_value="codex")
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".md", delete=False) as handle:
            prompt_path = Path(handle.name)

        runner._write_prompt_file = Mock(return_value=prompt_path)
        runner._run_process = AsyncMock(
            return_value=CodexProcessResult(
                stdout="still not json",
                stderr="",
                exit_code=0,
                final_output="still not json",
            )
        )

        with self.assertRaises(AIExecutionError):
            await runner.run(CodexJob("prompt", "json_object", 5, 1))
        self.assertEqual(runner._run_process.await_count, 2)

    def test_settings_choose_codex_cli_backend(self) -> None:
        settings = Settings(AI_BACKEND="codex_cli", CODEX_EXECUTABLE="codex")
        self.assertTrue(settings.uses_codex_cli())
        self.assertTrue(settings.is_ai_configured())


if __name__ == "__main__":
    unittest.main()
