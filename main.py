import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import recommend, understand


load_dotenv()

app = FastAPI(title="Pontis API", version="2.0.0")

allowed_origins = ["*"]
origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(understand.router, prefix="/api", tags=["understand"])
app.include_router(recommend.router, prefix="/api", tags=["recommend"])


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "pontis-api",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
    }
