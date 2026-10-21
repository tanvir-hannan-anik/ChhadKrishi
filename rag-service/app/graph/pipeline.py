"""
The LangGraph state machine.

    START → route_intent ─┬─ smalltalk / out_of_scope ───────────────→ not_applicable → END
                          ├─ too vague ───────────────────────────────→ clarify → END
                          ├─ photo ─→ analyze_vision ─┬─ unusable ───→ abstain → END
                          │                           └──────────┐
                          └──────────────────────────→ rewrite_query → retrieve → verify_evidence
    verify_evidence ─┬─ enough evidence ─→ detect_conflicts → generate → validate_citations
                     ├─ too little, retries left ─→ rewrite_query (broadened)
                     └─ too little ─→ abstain → END
    validate_citations ─┬─ passes ─→ finalize → END
                        ├─ fails, retries left ─→ generate (with the failures as feedback)
                        └─ fails ─→ repair; grounded content left ? finalize : abstain

Every node degrades safely: an LLM failure in routing or rewriting falls back to deterministic
rules; a failure in verification or generation abstains rather than answering unverified.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from ..config import Settings
from ..db import Filters
from ..ingest.metadata import tag_query
from ..llm import LlmClient, LlmError, image_part
from ..retrieval.hybrid import HybridRetriever, Passage
from . import prompts
from .citations import Validation, cited_numbers, has_grounded_content, page_reference, renumber, repair_draft, split_sentences, validate_draft, verbatim_quote
from .schemas import ConflictOut, Draft, FaithfulnessOut, GradeOut, IntentOut, RewriteOut, VisionObservations

log = logging.getLogger("rag.graph")

TASK_INTENT = {"diagnose": "disease_diagnosis", "garden_plan": "garden_planning", "care_plan": "plant_care"}
MESSAGES = {
    "not_applicable": {"en": "", "bn": ""},
    "abstain": {
        "en": "I could not find enough evidence in the Encyclopedia of Agriculture and Food Systems to answer this reliably, so I won't guess.",
        "bn": "এনসাইক্লোপিডিয়া অব এগ্রিকালচার অ্যান্ড ফুড সিস্টেমস-এ এই প্রশ্নের নির্ভরযোগ্য উত্তর দেওয়ার মতো যথেষ্ট তথ্য পাইনি, তাই অনুমান করে বলছি না।",
    },
    "photo": {
        "en": "I can't judge this photo reliably. Please take a sharp close-up in daylight showing the affected leaves (both sides) and the whole plant.",
        "bn": "ছবিটি থেকে নির্ভরযোগ্যভাবে বোঝা যাচ্ছে না। দিনের আলোতে আক্রান্ত পাতার (দুই পাশের) পরিষ্কার কাছ থেকে তোলা ছবি এবং পুরো গাছের একটি ছবি দিন।",
    },
    "not_plant": {"en": "This photo doesn't seem to show a plant.", "bn": "ছবিতে কোনো গাছ দেখা যাচ্ছে না বলে মনে হচ্ছে।"},
    "related": {"en": "Related sections you may want to read", "bn": "সংশ্লিষ্ট অংশ যা পড়ে দেখতে পারেন"},
    "vision_failed": {
        "en": "The photo could not be analysed right now, so I can't compare it with the encyclopedia.",
        "bn": "এই মুহূর্তে ছবিটি বিশ্লেষণ করা যায়নি, তাই এনসাইক্লোপিডিয়ার সঙ্গে মিলিয়ে দেখা সম্ভব হলো না।",
    },
}
CLARIFY_DEFAULT = {
    "en": ["Which plant is it?", "What exactly do you see (spots, yellowing, wilting, insects) and on which part?", "Is it in a pot on a rooftop/balcony or in the ground?"],
    "bn": ["গাছটির নাম কী?", "ঠিক কী দেখছেন (দাগ, হলুদ হওয়া, নেতিয়ে পড়া, পোকা) এবং গাছের কোন অংশে?", "গাছটি কি ছাদ/বারান্দার টবে, নাকি মাটিতে?"],
}


class GraphState(TypedDict, total=False):
    # request
    task: str
    question: str
    lang: str
    history: list[dict]
    context: str
    image: bytes | None
    image_media_type: str
    measurements: str
    filters: dict
    # working state
    intent: str
    standalone: str
    clarifying_questions: list[str]
    observations: dict | None
    queries: list[str]
    keywords: list[str]
    entities: dict
    retrieval_attempts: int
    seen_ids: list[str]
    candidates: list[Passage]
    evidence: list[dict]
    conflicts: list[dict]
    draft: Draft | None
    feedback: list[str]
    generation_attempts: int
    abstain_reason: str
    result: dict
    trace: dict


@dataclass
class Deps:
    settings: Settings
    llm: LlmClient
    retriever: HybridRetriever


def _timed(name: str, fn: Callable[[GraphState], dict]) -> Callable[[GraphState], dict]:
    def wrapper(state: GraphState) -> dict:
        started = time.monotonic()
        update = fn(state)
        trace = dict(state.get("trace") or {})
        timings = dict(trace.get("timings_ms") or {})
        timings[name] = timings.get(name, 0) + round((time.monotonic() - started) * 1000)
        trace["timings_ms"] = timings
        trace.update(update.pop("_trace", {}))
        update["trace"] = trace
        return update

    return wrapper


def _heuristic_intent(text: str) -> str:
    t = text.lower()
    rules = [
        ("disease_diagnosis", r"disease|sick|spot|blight|rot|wilt|pest|insect|aphid|mite|fung|yellow|curl|রোগ|পোকা|দাগ|পচ|হলুদ|নেতি"),
        ("fertilizer", r"fertili|manure|compost|npk|urea|nitrogen|potash|সার|খৈল|কম্পোস্ট"),
        ("garden_planning", r"design|layout|rooftop garden|balcony garden|ছাদ বাগান|বারান্দা"),
        ("crop_recommendation", r"what (can|should) i grow|which crop|best crop|suitable|কোন ফসল|কী চাষ"),
        ("plant_care", r"water|prun|repot|sunlight|care|পানি|যত্ন|রোদ"),
        ("smalltalk", r"^(hi|hello|thanks|thank you|ধন্যবাদ|হ্যালো|আসসালামু)\b"),
    ]
    for intent, pattern in rules:
        if re.search(pattern, t):
            return intent
    return "general_agriculture"


def _lang_of(text: str, default: str) -> str:
    bangla = sum(1 for ch in text if "ঀ" <= ch <= "৿")
    latin = sum(1 for ch in text if ch.isascii() and ch.isalpha())
    if bangla == 0 and latin == 0:
        return default
    return "bn" if bangla > latin * 0.3 else "en"


def _symptoms_text(observations: dict) -> str:
    """Symptoms as text; callers may send objects ({description, location}) or plain strings."""
    parts = []
    for x in observations.get("symptoms") or []:
        if isinstance(x, dict):
            parts.append(f"{x.get('description', '')} ({x.get('location', '')})".replace(" ()", ""))
        else:
            parts.append(str(x))
    return "; ".join(p for p in parts if p.strip())


def _evidence_dict(p: Passage, quote: str, supports: str) -> dict:
    return {
        "chunk_id": p.id,
        "content": p.content,
        "quote": quote,
        "supports": supports,
        "article": p.article,
        "heading_path": p.heading_path,
        "chunk_type": p.chunk_type,
        "page_start": p.page_start,
        "page_end": p.page_end,
        "page_label_start": p.page_label_start,
        "page_label_end": p.page_label_end,
        "page_ref": page_reference(p.page_label_start, p.page_label_end, p.page_start, p.page_end),
        "doi": p.doi,
        "authors": p.authors,
        "document_title": p.document_title,
        "year": p.year,
        "score": round(p.score, 4),
        "similarity": None if p.similarity is None else round(p.similarity, 4),
    }


def build_graph(deps: Deps):
    s = deps.settings

    # ---------------- nodes ----------------

    def route_intent(state: GraphState) -> dict:
        question = state["question"].strip()
        lang = state.get("lang") or _lang_of(question, "bn")
        task = state.get("task", "answer")
        if task in TASK_INTENT:
            return {"intent": TASK_INTENT[task], "standalone": question, "lang": lang, "clarifying_questions": []}
        history = state.get("history") or []
        transcript = "\n".join(f"{m.get('role', 'user')}: {str(m.get('text', ''))[:600]}" for m in history[-6:])
        try:
            out = deps.llm.complete_json(prompts.ROUTE_SYSTEM, f"CONVERSATION:\n{transcript or '(none)'}\n\nLATEST MESSAGE:\n{question}", IntentOut)
            standalone = out.standalone_question.strip() or question
            clarify = out.clarifying_questions[:3] if out.needs_clarification else []
            return {"intent": out.intent, "standalone": standalone, "lang": state.get("lang") or out.language, "clarifying_questions": clarify, "_trace": {"router": "llm"}}
        except LlmError as error:
            log.warning("intent routing fell back to rules: %s", error)
            return {"intent": _heuristic_intent(question), "standalone": question, "lang": lang, "clarifying_questions": [], "_trace": {"router": "rules"}}

    def analyze_vision(state: GraphState) -> dict:
        note = state.get("question", "")
        content = [
            {"type": "text", "text": f"Gardener's note: {note[:500] or '(none)'}\n{state.get('measurements') or ''}".strip()},
            image_part(state["image"], state.get("image_media_type") or "image/jpeg"),
        ]
        try:
            out = deps.llm.complete_json(prompts.VISION_SYSTEM, content, VisionObservations, vision=True)
            return {"observations": out.model_dump()}
        except LlmError as error:
            log.warning("vision analysis failed: %s", error)
            return {"observations": None, "abstain_reason": "vision_failed"}

    def rewrite_query(state: GraphState) -> dict:
        question = state.get("standalone") or state["question"]
        attempts = state.get("retrieval_attempts", 0)
        observations = state.get("observations")
        extra = ""
        if observations:
            symptoms = _symptoms_text(observations)
            extra = f"\nPlant (guess): {observations.get('plant_guess') or 'unknown'}\nVisible symptoms: {symptoms or 'none described'}\nVisible pests: {', '.join(observations.get('pests_visible', [])) or 'none'}"
        if state.get("context"):
            extra += f"\nContext: {state['context'][:800]}"
        if attempts > 0:
            extra += f"\nPrevious searches found no relevant passages: {state.get('queries')}. Use broader or alternative terms (synonyms, the crop family, the general problem type)."
        lexical = tag_query(f"{question} {extra}")
        try:
            out = deps.llm.complete_json(prompts.REWRITE_SYSTEM, f"QUESTION:\n{question}{extra}", RewriteOut)
            queries = [q for q in out.queries if q.strip()][:4]
            keywords = list(dict.fromkeys([k for k in out.keywords if k.strip()] + out.crops + out.problems))[:16]
        except LlmError as error:
            log.warning("query rewriting fell back to lexicon: %s", error)
            queries = []
            keywords = [v for vs in lexical.values() for v in vs]
        entities = {k: v for k, v in lexical.items() if v}
        return {"queries": queries, "keywords": keywords, "entities": entities, "retrieval_attempts": attempts + 1}

    def retrieve(state: GraphState) -> dict:
        f = state.get("filters") or {}
        filters = Filters(crops=f.get("crops"), diseases=f.get("diseases"), chunk_types=f.get("chunk_types")) if f else None
        result = deps.retriever.retrieve(
            question=state.get("standalone") or state["question"],
            queries=state.get("queries", []),
            keywords=state.get("keywords", []),
            entities=state.get("entities"),
            filters=filters,
            top_k=s.top_k_final + 2,
            exclude_ids=state.get("seen_ids", []),
        )
        seen = list(dict.fromkeys((state.get("seen_ids") or []) + [p.id for p in result.passages]))
        trace = {"retrieved": len(result.passages), "candidates": result.candidates, "best_similarity": result.best_similarity}
        # Keep the best passages from earlier attempts too: a retry broadens, it does not discard.
        previous = [p for p in (state.get("candidates") or []) if p.id not in {x.id for x in result.passages}]
        return {"candidates": result.passages + previous[:4], "seen_ids": seen, "_trace": trace}

    def verify_evidence(state: GraphState) -> dict:
        candidates = state.get("candidates") or []
        if not candidates:
            return {"evidence": [], "_trace": {"verified": 0}}
        question = state.get("standalone") or state["question"]
        if state.get("observations"):
            symptoms = _symptoms_text(state["observations"])
            question += f"\n(Photo shows: {state['observations'].get('plant_guess') or 'unknown plant'}; {symptoms})"
        listing = "\n\n".join(f"PASSAGE {i}: {p.heading_path}\n{p.content}" for i, p in enumerate(candidates, start=1))
        try:
            out = deps.llm.complete_json(prompts.GRADE_SYSTEM, f"QUESTION:\n{question}\n\n{listing}", GradeOut)
        except LlmError as error:
            log.warning("evidence verification failed: %s", error)
            return {"evidence": [], "abstain_reason": "verification_failed", "_trace": {"verified": 0}}
        evidence, seen = [], set()
        for grade in out.grades:
            if not grade.relevant or not (1 <= grade.passage <= len(candidates)) or grade.passage in seen:
                continue
            passage = candidates[grade.passage - 1]
            quote = verbatim_quote(grade.quote, passage.content)
            if quote is None:  # the grader could not point at real supporting text
                continue
            seen.add(grade.passage)
            evidence.append(_evidence_dict(passage, quote, grade.supports))
        evidence.sort(key=lambda e: -e["score"])
        evidence = evidence[: s.top_k_final]
        return {"evidence": evidence, "_trace": {"verified": len(evidence), "graded": len(out.grades)}}

    def detect_conflicts(state: GraphState) -> dict:
        evidence = state.get("evidence") or []
        if len(evidence) < 2:
            return {"conflicts": []}
        quotes = "\n".join(f"[{i}] ({e['heading_path']}) {e['quote']}" for i, e in enumerate(evidence, start=1))
        try:
            out = deps.llm.complete_json(prompts.CONFLICT_SYSTEM, f"QUESTION:\n{state.get('standalone') or state['question']}\n\nQUOTES:\n{quotes}", ConflictOut)
        except LlmError as error:
            log.warning("conflict detection skipped: %s", error)
            return {"conflicts": [], "_trace": {"conflict_check": "failed"}}
        conflicts = [
            {"description": c.description, "evidence": [n for n in c.evidence if 1 <= n <= len(evidence)]}
            for c in out.conflicts
            if len([n for n in c.evidence if 1 <= n <= len(evidence)]) >= 2
        ]
        return {"conflicts": conflicts, "_trace": {"conflicts": len(conflicts)}}

    def generate(state: GraphState) -> dict:
        lang = state.get("lang", "en")
        system = prompts.GENERATE_SYSTEM.replace("{language}", prompts.LANG_NAME.get(lang, prompts.LANG_NAME["en"]))
        user = prompts.generate_user(
            state.get("task", "answer"),
            state.get("standalone") or state["question"],
            state["evidence"],
            conflicts=state.get("conflicts", []),
            observations=state.get("observations"),
            context=state.get("context", ""),
            feedback=state.get("feedback", []),
        )
        attempts = state.get("generation_attempts", 0) + 1
        try:
            draft = deps.llm.complete_json(system, user, Draft, temperature=0.1)
            return {"draft": draft, "generation_attempts": attempts}
        except LlmError as error:
            log.warning("generation failed: %s", error)
            return {"draft": None, "generation_attempts": attempts, "abstain_reason": "generation_failed"}

    def check_faithfulness(draft: Draft, texts: list[str]) -> list[tuple[str, str]] | None:
        """(sentence, problem) for every cited sentence its sources do not state; None if the check could not run."""
        cited = [x for x in split_sentences(draft.answer) if cited_numbers(x)]
        cited += [f"{i.name}: {i.detail} " + "".join(f"[{n}]" for n in i.citations) for i in draft.items if i.detail]
        if not cited:
            return []
        listing = []
        for k, sentence in enumerate(cited, start=1):
            sources = "\n".join(f"  [{n}] {texts[n - 1][:1500]}" for n in dict.fromkeys(cited_numbers(sentence)) if 1 <= n <= len(texts))
            listing.append(f"SENTENCE {k}: {sentence}\n{sources}")
        try:
            out = deps.llm.complete_json(prompts.FAITHFULNESS_SYSTEM, "\n\n".join(listing), FaithfulnessOut)
        except LlmError as error:
            log.warning("faithfulness check unavailable: %s", error)
            return None
        return [(cited[c.sentence - 1], c.problem or "not stated by the source") for c in out.checks if not c.supported and 1 <= c.sentence <= len(cited)]

    def validate_citations(state: GraphState) -> dict:
        draft = state.get("draft")
        if draft is None:
            return {"feedback": ["generation failed"]}
        texts = [e["content"] for e in state["evidence"]]
        strict_terms = state.get("task") in ("diagnose", "garden_plan")
        validation = validate_draft(draft, texts, require_source_terms=strict_terms)
        trace = {"validation_errors": len(validation.errors)}
        if validation.ok:
            # Deterministic checks passed; now meaning: is every sentence what its sources say?
            unfaithful = check_faithfulness(draft, texts)
            if unfaithful is None:
                return {"feedback": [], "_trace": trace | {"faithfulness": "unavailable"}}
            trace["unfaithful_sentences"] = len(unfaithful)
            if not unfaithful:
                return {"feedback": [], "_trace": trace}
            errors = [f"Not what the cited passage says: \"{sentence[:140]}\" — {problem}" for sentence, problem in unfaithful]
            if state.get("generation_attempts", 0) < s.max_generation_attempts:
                return {"feedback": errors, "_trace": trace}
            validation = Validation(errors, {sentence for sentence, _ in unfaithful}, set())
        elif state.get("generation_attempts", 0) < s.max_generation_attempts:
            return {"feedback": validation.errors, "_trace": trace}
        repaired = repair_draft(draft, validation)
        recheck = validate_draft(repaired, texts, require_source_terms=strict_terms)
        if recheck.ok and has_grounded_content(repaired):
            return {"draft": repaired, "feedback": [], "_trace": trace | {"repaired": True}}
        return {"draft": None, "feedback": validation.errors, "abstain_reason": "citation_validation_failed", "_trace": trace}

    def finalize(state: GraphState) -> dict:
        draft: Draft = state["draft"]
        lang = state.get("lang", "en")
        if draft.status == "needs_clarification":
            return {"result": _result(state, "needs_clarification", answer="", clarifying=draft.clarifying_questions or CLARIFY_DEFAULT[lang])}
        if draft.status == "insufficient_evidence" or not has_grounded_content(draft):
            return abstain(state | {"abstain_reason": "insufficient_evidence", "clarifying_questions": draft.clarifying_questions})
        draft, order = renumber(draft)
        cited = [state["evidence"][n - 1] for n in order]
        citations = [_citation(i, e) for i, e in enumerate(cited, start=1)]
        old_to_new = {old: new for new, old in enumerate(order, start=1)}
        conflicts = [
            {"description": c["description"], "citations": [old_to_new[n] for n in c["evidence"] if n in old_to_new]}
            for c in state.get("conflicts", [])
        ]
        status = "answered" if draft.status == "answered" else "partial"
        return {
            "result": _result(
                state,
                status,
                answer=draft.answer,
                items=[i.model_dump() for i in draft.items],
                citations=citations,
                conflicts=conflicts,
                clarifying=draft.clarifying_questions,
                uncertainty=draft.uncertainty,
            )
        }

    def abstain(state: GraphState) -> dict:
        lang = state.get("lang", "en")
        reason = state.get("abstain_reason") or "insufficient_evidence"
        obs = state.get("observations")
        if reason == "vision_failed":
            message = MESSAGES["vision_failed"][lang]
        elif obs is not None and not obs.get("is_plant", True):
            message, reason = MESSAGES["not_plant"][lang], "not_a_plant"
        elif obs is not None and not obs.get("photo_usable", True):
            message, reason = MESSAGES["photo"][lang], "photo_unusable"
        else:
            message = MESSAGES["abstain"][lang]
        # Show where the closest material is, without claiming it answers the question.
        related = []
        for p in (state.get("candidates") or [])[:3]:
            related.append({"article": p.article, "heading_path": p.heading_path, "page_ref": page_reference(p.page_label_start, p.page_label_end, p.page_start, p.page_end), "pdf_page_start": p.page_start})
        clarifying = state.get("clarifying_questions") or (CLARIFY_DEFAULT[lang] if state.get("intent") == "disease_diagnosis" else [])
        return {"result": _result(state, "abstained", answer=message, clarifying=clarifying, related=related, reason=reason)}

    def clarify(state: GraphState) -> dict:
        lang = state.get("lang", "en")
        return {"result": _result(state, "needs_clarification", answer="", clarifying=state.get("clarifying_questions") or CLARIFY_DEFAULT[lang])}

    def not_applicable(state: GraphState) -> dict:
        return {"result": _result(state, "not_applicable", answer="")}

    # ---------------- edges ----------------

    def after_route(state: GraphState) -> str:
        if state["intent"] in ("smalltalk", "out_of_scope") and not state.get("image"):
            return "not_applicable"
        if state.get("image"):
            return "analyze_vision"
        if state.get("clarifying_questions"):
            return "clarify"
        return "rewrite_query"

    def after_vision(state: GraphState) -> str:
        obs = state.get("observations")
        if obs is None or not obs.get("is_plant") or not obs.get("photo_usable"):
            return "abstain"
        return "rewrite_query"

    def after_verify(state: GraphState) -> str:
        if len(state.get("evidence") or []) >= s.min_evidence:
            return "detect_conflicts"
        if state.get("abstain_reason") == "verification_failed":
            return "abstain"
        if state.get("retrieval_attempts", 0) < 2:
            return "rewrite_query"
        return "abstain"

    def after_validate(state: GraphState) -> str:
        if state.get("abstain_reason") in ("citation_validation_failed", "generation_failed") and state.get("draft") is None:
            if state.get("abstain_reason") == "generation_failed" and state.get("generation_attempts", 0) < s.max_generation_attempts:
                return "generate"
            return "abstain"
        if state.get("feedback"):
            return "generate"
        return "finalize"

    graph = StateGraph(GraphState)
    for name, fn in [
        ("route_intent", route_intent),
        ("analyze_vision", analyze_vision),
        ("rewrite_query", rewrite_query),
        ("retrieve", retrieve),
        ("verify_evidence", verify_evidence),
        ("detect_conflicts", detect_conflicts),
        ("generate", generate),
        ("validate_citations", validate_citations),
        ("finalize", finalize),
        ("abstain", abstain),
        ("clarify", clarify),
        ("not_applicable", not_applicable),
    ]:
        graph.add_node(name, _timed(name, fn))
    graph.add_edge(START, "route_intent")
    graph.add_conditional_edges("route_intent", after_route, ["not_applicable", "analyze_vision", "clarify", "rewrite_query"])
    graph.add_conditional_edges("analyze_vision", after_vision, ["abstain", "rewrite_query"])
    graph.add_edge("rewrite_query", "retrieve")
    graph.add_edge("retrieve", "verify_evidence")
    graph.add_conditional_edges("verify_evidence", after_verify, ["detect_conflicts", "rewrite_query", "abstain"])
    graph.add_edge("detect_conflicts", "generate")
    graph.add_edge("generate", "validate_citations")
    graph.add_conditional_edges("validate_citations", after_validate, ["generate", "finalize", "abstain"])
    for terminal in ("finalize", "abstain", "clarify", "not_applicable"):
        graph.add_edge(terminal, END)
    return graph.compile()


def _citation(n: int, e: dict) -> dict:
    return {
        "n": n,
        "chunk_id": e["chunk_id"],
        "document_title": e.get("document_title"),
        "year": e.get("year"),
        "article": e["article"],
        "authors": e.get("authors"),
        "heading_path": e["heading_path"],
        "page_ref": e["page_ref"],
        "pdf_page_start": e["page_start"],
        "pdf_page_end": e["page_end"],
        "page_label_start": e.get("page_label_start"),
        "page_label_end": e.get("page_label_end"),
        "doi": e.get("doi"),
        "quote": e["quote"],
        "chunk_type": e.get("chunk_type"),
    }


def _result(state: GraphState, status: str, *, answer: str, items: list | None = None, citations: list | None = None, conflicts: list | None = None, clarifying: list | None = None, uncertainty: str = "", related: list | None = None, reason: str | None = None) -> dict:
    trace = dict(state.get("trace") or {})
    trace.update({"retrieval_attempts": state.get("retrieval_attempts", 0), "generation_attempts": state.get("generation_attempts", 0), "queries": state.get("queries", [])})
    return {
        "status": status,
        "intent": state.get("intent"),
        "language": state.get("lang"),
        "answer": answer,
        "items": items or [],
        "citations": citations or [],
        "conflicts": conflicts or [],
        "clarifying_questions": (clarifying or [])[:3],
        "uncertainty": uncertainty,
        "related": related or [],
        "abstain_reason": reason,
        "observations": state.get("observations"),
        "trace": trace,
    }


def run(graph: Any, request: GraphState) -> dict:
    final = graph.invoke(request, {"recursion_limit": 40})
    return final["result"]
