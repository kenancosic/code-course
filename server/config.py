from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./mythiccode.db"
    OPENROUTER_API_KEY: str | None = None
    LLM_DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"
    LLM_FAST_MODEL: str = "google/gemini-flash-1.5"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
