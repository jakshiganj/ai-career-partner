import os
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    # App Environment: development | production
    APP_ENV: str = os.getenv("APP_ENV", "development")
    
    # Base URLs
    PROD_BACKEND_URL: str = "https://ai-career-backend-560579918305.asia-southeast1.run.app"
    PROD_FRONTEND_URL: str = "https://ai-career-frontend-560579918305.asia-southeast1.run.app"
    LOCAL_BACKEND_URL: str = "http://localhost:8000"
    LOCAL_FRONTEND_URL: str = "http://localhost:5173"

    @property
    def BACKEND_URL(self) -> str:
        return self.PROD_BACKEND_URL if self.APP_ENV == "production" else self.LOCAL_BACKEND_URL

    @property
    def FRONTEND_URL(self) -> str:
        return self.PROD_FRONTEND_URL if self.APP_ENV == "production" else self.LOCAL_FRONTEND_URL

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/career_db")
    LANGGRAPH_CHECKPOINT_URL: str = os.getenv("LANGGRAPH_CHECKPOINT_URL", "")

    @property
    def SYNC_DATABASE_URL(self) -> str:
        # LangGraph requires a synchronous postgresql connection (no +asyncpg)
        return self.DATABASE_URL.replace("+asyncpg", "")

    @property
    def CHECKPOINT_URL(self) -> str:
        if self.LANGGRAPH_CHECKPOINT_URL:
            return self.LANGGRAPH_CHECKPOINT_URL
        return self.SYNC_DATABASE_URL

    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_INSECURE_SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # OAuth States
    GOOGLE_STATE: str = os.getenv("GOOGLE_STATE", "career_partner_google_prod")
    LINKEDIN_STATE: str = os.getenv("LINKEDIN_STATE", "career_partner_linkedin_prod")

    # OAuth - Google
    GOOGLE_OAUTH_CLIENT_ID: str = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
    GOOGLE_OAUTH_CLIENT_SECRET: str = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
    
    @property
    def GOOGLE_OAUTH_REDIRECT_URI(self) -> str:
        return os.getenv("GOOGLE_OAUTH_REDIRECT_URI", f"{self.BACKEND_URL}/api/auth/google/callback")

    # OAuth - LinkedIn
    LINKEDIN_CLIENT_ID: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    LINKEDIN_CLIENT_SECRET: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    
    @property
    def LINKEDIN_REDIRECT_URI(self) -> str:
        return os.getenv("LINKEDIN_REDIRECT_URI", f"{self.BACKEND_URL}/api/auth/linkedin/callback")

    # CORS
    @property
    def CORS_ORIGINS(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            self.PROD_FRONTEND_URL
        ]
        if self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

settings = Settings()
