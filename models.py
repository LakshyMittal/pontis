from typing import List

from pydantic import BaseModel, Field, field_validator


class UnderstandRequest(BaseModel):
    description: str = Field(..., min_length=8, max_length=500)


class Question(BaseModel):
    text: str
    chips: List[str]

    @field_validator("chips")
    @classmethod
    def validate_chips(cls, value: List[str]) -> List[str]:
        if len(value) != 4:
            raise ValueError("Each question must have exactly 4 chips.")
        return value


class UnderstandResponse(BaseModel):
    persona_summary: str
    questions: List[Question]

    @field_validator("questions")
    @classmethod
    def validate_questions(cls, value: List[Question]) -> List[Question]:
        if len(value) != 2:
            raise ValueError("Response must contain exactly 2 follow-up questions.")
        return value


class RecommendRequest(BaseModel):
    description: str = Field(..., min_length=8, max_length=500)
    answers: List[str]

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, value: List[str]) -> List[str]:
        if len(value) != 2:
            raise ValueError("Exactly 2 answers are required.")
        return value


class RecommendResponse(BaseModel):
    tool: str
    reason: str
    prompt: str
    also_try: List[str]

    @field_validator("also_try")
    @classmethod
    def validate_alternatives(cls, value: List[str]) -> List[str]:
        if len(value) != 3:
            raise ValueError("Exactly 3 alternatives are required.")
        return value
