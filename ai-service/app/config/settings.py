from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ai-service"
    app_env: str = "development"
    app_port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
