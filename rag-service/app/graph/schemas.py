"""Structured LLM outputs used by the graph nodes (validated with pydantic)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Intent = Literal[
    "disease_diagnosis",
    "plant_care",
    "fertilizer",
    "crop_recommendation",
    "garden_planning",
    "general_agriculture",
    "smalltalk",
    "out_of_scope",
]


class IntentOut(BaseModel):
    intent: Intent
    language: Literal["bn", "en"] = "en"
    standalone_question: str = Field(description="The question rewritten to stand alone, using the conversation for missing context; in the user's language")
    needs_clarification: bool = Field(default=False, description="True only when the question cannot be answered without more details")
    clarifying_questions: list[str] = Field(default_factory=list, description="1-3 short questions when needs_clarification")


class Symptom(BaseModel):
    description: str = Field(description="What is visible, e.g. 'yellow patches between veins on older leaves'")
    location: str = Field(default="", description="Plant part and position")
    extent: str = Field(default="", description="How much of the plant is affected")


class VisionObservations(BaseModel):
    is_plant: bool
    photo_usable: bool = Field(description="False when blurry, dark, too far or partial to judge")
    photo_problems: list[str] = Field(default_factory=list)
    plant_guess: str = Field(default="", description="Common name if recognisable, else empty")
    plant_guess_confidence: Literal["low", "medium", "high"] = "low"
    parts_visible: list[str] = Field(default_factory=list)
    symptoms: list[Symptom] = Field(default_factory=list)
    pests_visible: list[str] = Field(default_factory=list, description="Only insects/mites actually visible")
    healthy_looking: bool = False


class RewriteOut(BaseModel):
    queries: list[str] = Field(description="2-4 English search queries for an agriculture encyclopedia")
    keywords: list[str] = Field(description="5-12 English keywords or short phrases (technical terms, Latin names)")
    crops: list[str] = Field(default_factory=list)
    problems: list[str] = Field(default_factory=list, description="Diseases, pests, deficiencies mentioned or suspected")


class Grade(BaseModel):
    passage: int = Field(description="Passage number as given")
    relevant: bool = Field(description="True only if the passage directly helps answer the question")
    supports: str = Field(default="", description="What part of the question it answers, in a few words")
    quote: str = Field(default="", description="The single most relevant sentence, copied EXACTLY from the passage")


class GradeOut(BaseModel):
    grades: list[Grade]


class Conflict(BaseModel):
    description: str
    evidence: list[int]


class ConflictOut(BaseModel):
    conflicts: list[Conflict] = Field(default_factory=list)


class SentenceCheck(BaseModel):
    sentence: int = Field(description="Sentence number as given")
    supported: bool = Field(description="True only if the cited quotes state this, with the same meaning (translation is fine)")
    problem: str = Field(default="", description="What is wrong, e.g. 'mistranslates growth substrates as wheat'")


class FaithfulnessOut(BaseModel):
    checks: list[SentenceCheck]


class DraftItem(BaseModel):
    name: str = Field(description="Item name in the answer language")
    source_term: str = Field(default="", description="The item's name copied exactly as written in the cited evidence (English)")
    detail: str = Field(default="", description="One or two sentences, grounded in the cited evidence")
    citations: list[int] = Field(default_factory=list)
    likelihood: Literal["low", "medium", "high", ""] = ""


class Draft(BaseModel):
    status: Literal["answered", "partial", "insufficient_evidence", "needs_clarification"]
    answer: str = Field(default="", description="Markdown answer; every factual sentence ends with citations like [1] or [2, 3]")
    items: list[DraftItem] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)
    uncertainty: str = Field(default="", description="What the evidence does not cover or where it is uncertain")
