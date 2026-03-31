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
        "The answers may be chip selections or custom free-text clarifications from the user. "
        "Treat them as the most important signals about what the user really wants. "
        "Recommend the single best AI workflow for their exact situation. "
        "Choose one primary outcome only and keep every step aligned to that same outcome. "
        "Do not mix different goals like audience growth, SEO setup, design audits, and productivity cleanup in one workflow unless they are directly part of the same immediate outcome. "
        "Return an execution-ready workflow with 2 to 4 steps only. "
        "Each step must include the tool, purpose, exact instruction, and exact prompt. "
        "The output must feel copy-paste ready, not abstract or vague. "
        "Do not give generic advice like 'find a playlist' or 'practice some problems'. "
        "Instead, give a concrete next action such as an exact search query, exact starting category, exact pattern, or exact way to use the tool. "
        "If a step uses ChatGPT or another AI tool, make the instruction contextual to the user's real task, not generic explanation advice. "
        "Prefer instructions that remove thinking for the user and help them start immediately. "
        "Make the workflow feel like a repeatable loop or system when possible. "
        "Keep each step practical, short, and specific. "
        "Use short, human, clear workflow titles and tags. "
        "Workflow titles should sound like product guidance, not machine output. "
        "Workflow tags should be readable labels like 'Audience Growth', 'Interview Prep', or 'Client Outreach', not snake_case or raw database strings. "
        "The 'also_try' field must contain exactly 3 real alternative AI tools or platforms, not advice, strategies, or actions. "
        "Bad example for also_try: 'Run a monthly live Q&A'. Good example: 'Claude', 'Notion AI', 'Canva AI'. "
        "Return ONLY valid JSON: "
        '{ "workflow_title": "...", "workflow_tag": "...", "reason": "...", "workflow_steps": [{"step": 1, "tool": "...", "purpose": "...", "instruction": "...", "prompt": "..."}], "also_try": ["...", "...", "..."] }'
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
                    "content": (
                        "You are Pontis. Return only valid JSON and no extra text. "
                        "Your job is to generate execution-first workflows that feel more useful than asking ChatGPT directly. "
                        "Be specific, concrete, and practical. "
                        "Prefer one sharp workflow over broad generic advice."
                    )
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
