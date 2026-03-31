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


class WorkflowStep(BaseModel):
    step: int
    tool: str
    purpose: str
    instruction: str
    prompt: str


class RecommendResponse(BaseModel):
    workflow_title: str
    workflow_tag: str
    reason: str
    workflow_steps: List[WorkflowStep]
    also_try: List[str]

    @field_validator("workflow_steps")
    @classmethod
    def validate_workflow_steps(cls, value: List[WorkflowStep]) -> List[WorkflowStep]:
        if len(value) < 2 or len(value) > 4:
            raise ValueError("Workflow must contain between 2 and 4 steps.")
        return value

    @field_validator("also_try")
    @classmethod
    def validate_alternatives(cls, value: List[str]) -> List[str]:
        if len(value) != 3:
            raise ValueError("Exactly 3 alternatives are required.")
        return value
