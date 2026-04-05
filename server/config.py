from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


SERVER_DIR = Path(__file__).resolve().parent
REPO_ROOT = SERVER_DIR.parent


def _normalize_database_url(database_url: str) -> str:
    sqlite_prefix = "sqlite:///"
    if not database_url.startswith(sqlite_prefix):
        return database_url

    raw_path = database_url[len(sqlite_prefix):]
    db_path = Path(raw_path)
    if db_path.is_absolute():
        return database_url

    normalized_path = (REPO_ROOT / db_path).resolve()
    return f"{sqlite_prefix}{normalized_path.as_posix()}"


def _normalize_repo_path(raw_path: str) -> str:
    path = Path(raw_path)
    if path.is_absolute():
        return str(path.resolve())
    return str((REPO_ROOT / path).resolve())


class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite:///{(SERVER_DIR / 'mythiccode.db').as_posix()}"
    AI_BACKEND: str = "codex_cli"
    CODEX_EXECUTABLE: str | None = "codex"
    CODEX_WORKDIR: str = str(REPO_ROOT)
    CODEX_TIMEOUT_SECONDS: int = 120
    CODEX_QUEUE_MAXSIZE: int = 8
    CODEX_MAX_RETRIES: int = 2
    OPENAI_API_KEY: str | None = None
    LLM_DEFAULT_MODEL: str = "gpt-5.4"
    LLM_FAST_MODEL: str = "gpt-5.4-mini"
    LLM_REASONING_EFFORT: str = "medium"
    GRIMOIRE_UPLOAD_DIR: str = "./server/uploads/grimoires"
    DEBUG: bool = False

    class Config:
        env_file = "server/.env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def model_post_init(self, __context) -> None:
        self.DATABASE_URL = _normalize_database_url(self.DATABASE_URL)
        self.CODEX_WORKDIR = _normalize_repo_path(self.CODEX_WORKDIR)
        self.GRIMOIRE_UPLOAD_DIR = _normalize_repo_path(self.GRIMOIRE_UPLOAD_DIR)

    def uses_codex_cli(self) -> bool:
        return self.AI_BACKEND.strip().lower() == "codex_cli"

    def is_ai_configured(self) -> bool:
        if self.uses_codex_cli():
            return bool(self.CODEX_EXECUTABLE)
        return bool(self.OPENAI_API_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()
