"""
Structure-aware chunking.

- Chunks never cross an article or section boundary (a section change flushes the buffer).
- Text is packed paragraph by paragraph up to `target_chars`, splitting oversized paragraphs on
  sentence boundaries; consecutive text chunks share `overlap_chars` of trailing sentences.
- Tables and figure captions become their own chunks (tables split by rows, header repeated).
- Every chunk records its PDF page range, printed page labels, heading path and DOI, and a
  deterministic id, so re-ingestion is idempotent and every answer can cite an exact page.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Iterable, Iterator

from .metadata import tag
from .pdf_extract import Block

SENTENCE_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9(\"'])")


@dataclass
class Chunk:
    id: str
    document_id: str
    chunk_index: int
    chunk_type: str  # text | table | figure | ocr
    volume: str
    article: str
    section: str
    subsection: str
    heading_path: str
    page_start: int
    page_end: int
    page_label_start: str
    page_label_end: str
    doi: str | None
    content: str
    metadata: dict[str, list[str]] = field(default_factory=dict)

    def embedding_text(self) -> str:
        """Heading context travels with the passage so the vector knows what it is about."""
        return f"{self.heading_path}\n\n{self.content}"

    def as_row(self) -> dict:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "chunk_type": self.chunk_type,
            "volume": self.volume,
            "article": self.article,
            "section": self.section,
            "subsection": self.subsection,
            "heading_path": self.heading_path,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "page_label_start": self.page_label_start,
            "page_label_end": self.page_label_end,
            "doi": self.doi,
            "content": self.content,
            "crops": self.metadata.get("crops", []),
            "diseases": self.metadata.get("diseases", []),
            "soils": self.metadata.get("soils", []),
            "seasons": self.metadata.get("seasons", []),
            "nutrients": self.metadata.get("nutrients", []),
        }


@dataclass
class _Piece:
    text: str
    page: int
    label: str


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in SENTENCE_RE.split(text.replace("\n", " ")) if s.strip()]


class Chunker:
    def __init__(self, document_id: str, *, target_chars: int = 1200, max_chars: int = 1800, overlap_chars: int = 220, min_chars: int = 160) -> None:
        self.document_id = document_id
        self.target = target_chars
        self.max = max_chars
        self.overlap = overlap_chars
        self.min = min_chars
        self._index = 0

    def _make(self, kind: str, pieces: list[_Piece], ctx: Block, text: str | None = None) -> Chunk:
        content = text if text is not None else " ".join(p.text for p in pieces).strip()
        content = re.sub(r"\s+\n", "\n", re.sub(r"[ \t]+", " ", content)).strip()
        section = ctx.sections[0] if ctx.sections else ""
        subsection = " › ".join(ctx.sections[1:])
        heading_path = " › ".join([x for x in (ctx.article, *ctx.sections) if x])
        digest = hashlib.sha1(f"{self.document_id}|{heading_path}|{pieces[0].page}|{content}".encode("utf-8")).hexdigest()[:20]
        chunk = Chunk(
            id=f"{self.document_id}:{digest}",
            document_id=self.document_id,
            chunk_index=self._index,
            chunk_type=kind,
            volume=ctx.volume,
            article=ctx.article,
            section=section,
            subsection=subsection,
            heading_path=heading_path,
            page_start=pieces[0].page,
            page_end=pieces[-1].page,
            page_label_start=pieces[0].label,
            page_label_end=pieces[-1].label,
            doi=ctx.doi,
            content=content,
            metadata=tag(f"{heading_path}\n{content}"),
        )
        self._index += 1
        return chunk

    def _overlap_tail(self, pieces: list[_Piece]) -> list[_Piece]:
        """Trailing whole sentences (about overlap_chars) carried into the next chunk."""
        tail: list[_Piece] = []
        size = 0
        for piece in reversed(pieces):
            sentences = split_sentences(piece.text)
            kept: list[str] = []
            for sentence in reversed(sentences):
                if size + len(sentence) > self.overlap and (kept or tail):
                    break
                kept.insert(0, sentence)
                size += len(sentence)
            if kept:
                tail.insert(0, _Piece(" ".join(kept), piece.page, piece.label))
            if size >= self.overlap or len(kept) < len(sentences):
                break
        return tail

    def chunk(self, blocks: Iterable[Block]) -> Iterator[Chunk]:
        buffer: list[_Piece] = []
        ctx: Block | None = None
        fresh = 0  # characters in the buffer that are not overlap from the previous chunk

        def flush(final: bool) -> Iterator[Chunk]:
            nonlocal buffer, fresh
            if ctx is None or not buffer:
                buffer, fresh = [], 0
                return
            size = sum(len(p.text) for p in buffer)
            if fresh > 0 and (size >= self.min or final):
                yield self._make("text", buffer, ctx)
            buffer = [] if final else self._overlap_tail(buffer)
            fresh = 0

        for block in blocks:
            key = (block.article, tuple(block.sections))
            if ctx is not None and key != (ctx.article, tuple(ctx.sections)):
                yield from flush(final=True)
            if block.is_heading:
                ctx = block
                continue
            if block.kind in ("table", "figure"):
                yield from self._special(block)
                ctx = ctx if ctx is not None and key == (ctx.article, tuple(ctx.sections)) else block
                continue
            ctx = block
            parts = [block.text] if len(block.text) <= self.max else _pack(split_sentences(block.text), self.target)
            for part in parts:
                if buffer and sum(len(p.text) for p in buffer) + len(part) > self.target and fresh > 0:
                    yield from flush(final=False)
                buffer.append(_Piece(part.replace("\n", " "), block.page, block.page_label))
                fresh += len(part)
        yield from flush(final=True)

    def _special(self, block: Block) -> Iterator[Chunk]:
        piece = _Piece(block.text, block.page, block.page_label)
        if block.kind == "figure" or len(block.text) <= self.max:
            yield self._make(block.kind, [piece], block, block.text)
            return
        # Large table: split by rows, repeating title + header row in every part.
        lines = block.text.split("\n")
        header_end = next((i for i, l in enumerate(lines) if re.match(r"^\|?\s*-{3}", l)), 1) + 1
        header, rows = lines[:header_end], lines[header_end:]
        part: list[str] = []
        for row in rows:
            if part and len("\n".join(header + part + [row])) > self.max:
                yield self._make("table", [piece], block, "\n".join(header + part))
                part = []
            part.append(row)
        if part:
            yield self._make("table", [piece], block, "\n".join(header + part))


def _pack(sentences: list[str], target: int) -> list[str]:
    parts, current = [], ""
    for sentence in sentences:
        if current and len(current) + len(sentence) > target:
            parts.append(current)
            current = ""
        current = f"{current} {sentence}".strip()
    if current:
        parts.append(current)
    return parts
