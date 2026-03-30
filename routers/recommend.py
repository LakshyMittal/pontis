import json
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from openai import OpenAI

from models import RecommendRequest, RecommendResponse


router = APIRouter()


def build_recommend_prompt(description: str, answers: list[str]) -> str:
    return (
        f"User is: {description}. "
        f"They answered: {answers}. "
        "Recommend the single best AI tool for their exact situation. "
        "Return ONLY valid JSON: "
        '{ "tool": "...", "reason": "...", "prompt": "...", "also_try": ["...", "...", "..."] }'
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


@router.post("/recommend", response_model=RecommendResponse)
async def recommend_tool(req: RecommendRequest) -> RecommendResponse:
    try:
        client = get_client()
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are Pontis. Return only valid JSON and no extra text."
                },
                {
                    "role": "user",
                    "content": build_recommend_prompt(req.description, req.answers)
                }
            ],
        )
        text = response.choices[0].message.content or ""
        payload = extract_json_payload(text)
        return RecommendResponse.model_validate(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to recommend a tool: {exc}") from exc
