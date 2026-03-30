import json
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from openai import OpenAI

from models import UnderstandRequest, UnderstandResponse


router = APIRouter()


def build_understand_prompt(description: str) -> str:
    return (
        f"The user described themselves as: {description}. "
        "Generate exactly 2 follow-up questions to understand their specific needs. "
        "Each question must have exactly 4 short chip answers. "
        "Return ONLY valid JSON: "
        '{ "persona_summary": "...", "questions": [{"text": "...", "chips": ["...", "...", "...", "..."]}] }'
    )


def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")
    return OpenAI(api_key=api_key)


def extract_json_payload(raw_text: str) -> Any:
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("OpenAI did not return valid JSON.")
    return json.loads(raw_text[start:end + 1])


@router.post("/understand", response_model=UnderstandResponse)
async def understand_user(req: UnderstandRequest) -> UnderstandResponse:
    try:
        client = get_client()
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are Pontis, an AI router. Return only valid JSON and no extra text."
                },
                {
                    "role": "user",
                    "content": build_understand_prompt(req.description)
                }
            ],
        )
        text = response.choices[0].message.content or ""
        payload = extract_json_payload(text)
        return UnderstandResponse.model_validate(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to understand user context: {exc}") from exc
