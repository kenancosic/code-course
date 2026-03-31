from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./server/mythiccode.db"
    OPENAI_API_KEY: str | None = None
    LLM_DEFAULT_MODEL: str = "gpt-4.1"
    LLM_FAST_MODEL: str = "gpt-4.1-mini"
    GRIMOIRE_UPLOAD_DIR: str = "./server/uploads/grimoires"
    DEBUG: bool = False

    class Config:
        env_file = "server/.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
