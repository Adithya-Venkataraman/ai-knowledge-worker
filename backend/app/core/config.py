from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aikw:aikw_secret@localhost:5433/aikw"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    COHERE_API_KEY: str = ""

    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIM: int = 1536

    # App
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev_secret"
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_MB: int = 50
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64


settings = Settings()