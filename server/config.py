from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./server/mythiccode.db"
    OPENROUTER_API_KEY: str | None = None
    LLM_DEFAULT_MODEL: str = "anthropic/claude-sonnet-4.6"
    LLM_FAST_MODEL: str = "google/gemini-2.5-flash"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
