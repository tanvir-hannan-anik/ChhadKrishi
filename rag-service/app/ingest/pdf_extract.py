"""
Structure-aware extraction from the encyclopedia PDF with PyMuPDF.

The book's outline (TOC) is the backbone: level 1 = volume part, level 2 = article, levels 3–4 =
sections. Every extracted block keeps its PDF page number (1-based) and the printed page label
(e.g. "V1:37"), so answers can always point back to the original page.

Per page we produce, in reading order:
  text     body paragraphs (two-column layout handled), running headers/footers removed
  table    tables found by PyMuPDF, rendered as Markdown, with their "Table N" title
  figure   "Figure N" captions, plus the diagram's own text labels when present
  ocr      text recognised with Tesseract on pages that have no text layer (when available)

Headings are matched against the TOC entries that start on that page, so section boundaries are
exact rather than guessed from font sizes.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

log = logging.getLogger("rag.ingest.extract")

# Sections that carry no answerable content (bibliographies, link lists) are skipped.
SKIP_SECTIONS = {"references", "relevant websites", "relevant website", "further reading", "see also", "multimedia annexes", "bibliography"}
# Front/back matter articles (level-2 outline entries) that are not encyclopedia articles.
SKIP_ARTICLE_RE = re.compile(
    r"^(front ?cover|encyclopedia ?of ?agriculture ?and ?food ?systems|editorial board|contributors to volume \d|guide to using the encyclopedia"
    r"|subject classification|preface|contents (of all volumes|to volume \d)|index|copyright)$"
)


def is_front_matter(article: str) -> bool:
    return not article or bool(SKIP_ARTICLE_RE.match(norm_title(article)))
HEADER_MAX_Y = 45.0  # running header band (page number + article title)
FOOTER_MIN_Y_RATIO = 0.94  # first-page footer: "Encyclopedia of …, Volume N" + DOI
BODY_MIN_FONT = 7.6  # diagram labels and footnote-size text are below this
CAPTION_RE = re.compile(r"^(Figure|Fig\.|Table|Plate|Box)\s+(\d+[A-Za-z]?)\b")
DOI_RE = re.compile(r"doi:\s*(10\.\d{4,}/[^\s]+)", re.IGNORECASE)
COPYRIGHT_RE = re.compile(r"\b(19|20)\d\d\s+Elsevier\b.*rights reserved", re.IGNORECASE)


def normalize_text(text: str) -> str:
    """NFKC (ligatures ﬁ→fi), joins hyphenated line breaks, collapses whitespace."""
    text = unicodedata.normalize("NFKC", text).replace("­", "")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def norm_title(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKC", text).lower()).strip()


@dataclass
class TocEntry:
    level: int
    title: str
    page: int  # 1-based PDF page


@dataclass
class Block:
    kind: str  # text | table | figure | ocr
    text: str
    page: int  # 1-based PDF page
    page_label: str
    volume: str
    article: str
    sections: list[str] = field(default_factory=list)  # level-3/4 headings, outermost first
    doi: str | None = None
    is_heading: bool = False
    figure_ref: str | None = None
    bbox: tuple[float, float, float, float] | None = None


@dataclass
class ExtractReport:
    pages_total: int = 0
    pages_processed: int = 0
    pages_skipped_front_matter: int = 0
    pages_ocr: int = 0
    pages_ocr_unavailable: list[int] = field(default_factory=list)
    tables: int = 0
    figures: int = 0
    images: int = 0
    articles: int = 0
    blocks: int = 0
    authors: dict[str, str] = field(default_factory=dict)  # article → author line(s)

    def as_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if k != "authors"} | {"articles_with_authors": len(self.authors)}


def read_toc(doc) -> list[TocEntry]:
    return [TocEntry(level=lvl, title=normalize_text(title), page=page) for lvl, title, page in doc.get_toc(simple=True) if page > 0]


@dataclass
class _Section:
    article: str
    volume: str
    path: list[str]
    skip: bool


class OutlineIndex:
    """Answers: which article/section is active at (page, heading)?"""

    def __init__(self, toc: list[TocEntry]) -> None:
        self.toc = toc
        self.by_page: dict[int, list[TocEntry]] = {}
        for entry in toc:
            self.by_page.setdefault(entry.page, []).append(entry)

    def articles(self) -> list[tuple[TocEntry, str]]:
        """(article entry, volume title) for every level-2 entry."""
        out, volume = [], ""
        for entry in self.toc:
            if entry.level == 1:
                volume = entry.title
            elif entry.level == 2:
                out.append((entry, volume))
        return out


def _ocr_page(page, language: str, tesseract_cmd: str) -> str | None:
    try:
        import pytesseract
        from PIL import Image

        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        pix = page.get_pixmap(dpi=300)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        return pytesseract.image_to_string(image, lang=language)
    except Exception as error:  # tesseract binary missing, language pack missing, …
        log.debug("OCR unavailable on page %s: %s", page.number + 1, error)
        return None


def _reading_order(blocks: list[dict], page_width: float, boxes: list[tuple[float, float, float, float]] = ()) -> list[dict]:
    """
    Two-column pages: full-width blocks and full-width shaded boxes (glossaries) split the page into
    bands; inside a band the left column is read before the right one.
    """
    mid = page_width / 2
    full = [b for b in blocks if (b["bbox"][2] - b["bbox"][0]) > page_width * 0.55]
    cuts = sorted([b["bbox"][1] for b in full] + [y for box in boxes if box[2] - box[0] > page_width * 0.55 for y in (box[1], box[3])])

    def band(b: dict) -> int:
        y = b["bbox"][1]
        return sum(1 for c in cuts if c <= y)

    def column(b: dict) -> int:
        if b in full:
            return 0
        return 0 if (b["bbox"][0] + b["bbox"][2]) / 2 < mid else 1

    return sorted(blocks, key=lambda b: (band(b), column(b), b["bbox"][1], b["bbox"][0]))


def _block_text(block: dict, min_font: float) -> tuple[str, float, bool]:
    """Text of a block's spans at body size or larger; returns (text, max font size, all bold)."""
    lines, sizes, bold = [], [], True
    for line in block.get("lines", []):
        # This PDF encodes word spaces as separate whitespace-only spans (often in another font):
        # they must be kept, whatever their size, or words run together.
        spans = [s for s in line["spans"] if s["size"] >= min_font or not s["text"].strip()]
        visible = [s for s in spans if s["text"].strip()]
        if not visible:
            continue
        sizes.extend(s["size"] for s in visible)
        bold = bold and all((s["flags"] & 16) or ".B" in s["font"] or "Bold" in s["font"] for s in visible)
        lines.append("".join(s["text"] for s in spans))
    return "\n".join(lines), (max(sizes) if sizes else 0.0), (bold and bool(lines))


def iter_blocks(pdf_path: str | Path, *, pages: range | None = None, ocr_language: str = "eng", tesseract_cmd: str = "", report: ExtractReport | None = None) -> Iterator[Block]:
    import pymupdf

    report = report if report is not None else ExtractReport()
    doc = pymupdf.open(str(pdf_path))
    report.pages_total = doc.page_count
    outline = OutlineIndex(read_toc(doc))
    articles = outline.articles()
    report.articles = sum(1 for a, _ in articles if not is_front_matter(a.title))
    # Article that owns each page: the last level-2 entry starting at or before it.
    starts = sorted((a.page, a.title, vol) for a, vol in articles)

    def article_for(page_no: int) -> tuple[str, str]:
        current = ("", "")
        for start, title, vol in starts:
            if start <= page_no:
                current = (title, vol)
            else:
                break
        return current

    state = _Section(article="", volume="", path=[], skip=True)
    doi_by_article: dict[str, str] = {}
    authors_by_article = report.authors
    page_range = pages or range(1, doc.page_count + 1)

    for page_no in page_range:
        page = doc[page_no - 1]
        label = page.get_label() or str(page_no)
        article, volume = article_for(page_no)
        if article != state.article:
            state = _Section(article=article, volume=volume, path=[], skip=is_front_matter(article))
        if state.skip:
            report.pages_skipped_front_matter += 1
            continue
        report.pages_processed += 1

        # Section headings expected on this page (levels 3/4), in outline order.
        pending = [e for e in outline.by_page.get(page_no, []) if e.level >= 3]
        page_dict = page.get_text("dict")
        width, height = page.rect.width, page.rect.height
        raw = [b for b in page_dict["blocks"]]
        report.images += sum(1 for b in raw if b["type"] == 1)
        text_blocks = [b for b in raw if b["type"] == 0]

        # Footer DOI and volume (first page of each article).
        for b in text_blocks:
            if b["bbox"][1] >= height * FOOTER_MIN_Y_RATIO:
                footer = " ".join(s["text"] for line in b["lines"] for s in line["spans"])
                if m := DOI_RE.search(footer):
                    doi_by_article[article] = m.group(1).rstrip(".")

        body = [b for b in text_blocks if b["bbox"][1] > HEADER_MAX_Y and b["bbox"][1] < height * FOOTER_MIN_Y_RATIO]
        # Article first page: drop-cap letter, title, authors and "© 2014 Elsevier" sit above the
        # copyright line. Authors are kept for citations; the rest is not content.
        copyright_y = next((b["bbox"][3] for b in body if COPYRIGHT_RE.search(_block_text(b, 5.0)[0])), None)
        if copyright_y is not None:
            header_blocks = [b for b in body if b["bbox"][1] < copyright_y]
            authors = [normalize_text(_block_text(b, 5.0)[0]) for b in header_blocks if 8.5 <= _block_text(b, 5.0)[1] < 10]
            authors_by_article.setdefault(article, "; ".join(a.replace("\n", "; ") for a in authors if a and not COPYRIGHT_RE.search(a))[:600])
            body = [b for b in body if b["bbox"][1] >= copyright_y]
        body = [b for b in body if _block_text(b, 5.0)[1] < 20]  # section-letter dividers ("A")

        # Tables: only pages that mention a table caption (find_tables is slow).
        table_boxes: list[tuple[float, float, float, float]] = []
        page_text_plain = page.get_text("text")
        if re.search(r"^Table \d", page_text_plain, re.MULTILINE):
            try:
                for table in page.find_tables().tables:
                    markdown = normalize_text(table.to_markdown())
                    if markdown.count("|") < 6:
                        continue
                    table_boxes.append(tuple(table.bbox))
                    title = _nearest_caption(body, table.bbox, "Table")
                    report.tables += 1
                    yield Block("table", f"{title}\n{markdown}".strip(), page_no, label, volume, article, list(state.path), doi_by_article.get(article), bbox=tuple(table.bbox), figure_ref=_ref(title))
            except Exception as error:  # a malformed table must not stop ingestion
                log.debug("table extraction failed on page %s: %s", page_no, error)

        def inside_table(b: dict) -> bool:
            x0, y0, x1, y1 = b["bbox"]
            return any(x0 >= t[0] - 2 and y0 >= t[1] - 2 and x1 <= t[2] + 2 and y1 <= t[3] + 2 for t in table_boxes)

        image_boxes = [b["bbox"] for b in raw if b["type"] == 1]
        # Shaded boxes (the glossary on an article's first page, "Box N" sidebars): their text is a
        # separate section, so it is never spliced into the body text that flows around them.
        shaded = _shaded_boxes(page, width, height)
        diagram_labels: list[str] = []
        page_figures: list[Block] = []
        emitted = 0
        box_label: dict[int, str] = {}
        for b in _reading_order([b for b in body if not inside_table(b)], width, shaded):
            text, size, bold = _block_text(b, BODY_MIN_FONT)
            box = next((i for i, bx in enumerate(shaded) if _contains(bx, b["bbox"])), None)
            if box is not None and text.strip():
                text = normalize_text(text)
                box_name = box_label.setdefault(box, "Glossary" if text.lower().startswith("glossary") else "Box")
                if box_name == "Glossary" and text.lower().startswith("glossary"):
                    text = text[len("glossary") :].strip()
                if text:
                    yield Block("text", text, page_no, label, volume, article, [*state.path, box_name], doi_by_article.get(article), bbox=tuple(b["bbox"]))
                continue
            if not text.strip():
                # Small-font text: diagram labels (kept for the figure) or footnotes.
                small, _, _ = _block_text(b, 5.0)
                if small.strip() and any(_overlaps(b["bbox"], ib) for ib in image_boxes):
                    diagram_labels.append(small.replace("\n", " "))
                continue
            text = normalize_text(text)
            first_line = text.split("\n", 1)[0]

            # Heading? Match against TOC entries starting on this page.
            match = next((e for e in pending if norm_title(first_line) and (norm_title(first_line) == norm_title(e.title) or (bold and norm_title(e.title).startswith(norm_title(first_line)) and len(first_line) > 8))), None)
            if match is not None:
                pending.remove(match)
                depth = match.level - 3
                state.path = state.path[:depth] + [match.title]
                if any(norm_title(p) in SKIP_SECTIONS for p in state.path):
                    continue
                rest = text.split("\n", 1)[1] if "\n" in text and norm_title(first_line) == norm_title(match.title) else ""
                yield Block("text", match.title, page_no, label, volume, article, list(state.path), doi_by_article.get(article), is_heading=True)
                if rest.strip():
                    emitted += 1
                    yield Block("text", rest, page_no, label, volume, article, list(state.path), doi_by_article.get(article), bbox=tuple(b["bbox"]))
                continue
            if any(norm_title(p) in SKIP_SECTIONS for p in state.path):
                continue
            if norm_title(text) == norm_title(article):  # article title on its first page
                continue

            caption = CAPTION_RE.match(text)
            if caption and caption.group(1) in ("Figure", "Fig.", "Plate"):
                report.figures += 1
                page_figures.append(Block("figure", text.replace("\n", " "), page_no, label, volume, article, list(state.path), doi_by_article.get(article), figure_ref=f"Figure {caption.group(2)}", bbox=tuple(b["bbox"])))
                continue
            if caption and caption.group(1) == "Table" and table_boxes:
                continue  # already emitted as the table's title
            emitted += 1
            yield Block("text", text, page_no, label, volume, article, list(state.path), doi_by_article.get(article), bbox=tuple(b["bbox"]))

        # Headings the outline puts on this page but that were not found in the text: switch anyway.
        for e in pending:
            state.path = state.path[: e.level - 3] + [e.title]

        # Text inside diagrams is made searchable through the caption of the figure on the same page.
        labels = "; ".join(dict.fromkeys(diagram_labels))[:1200]
        if labels and page_figures:
            page_figures[-1].text += f" [Diagram labels: {labels}]"
        elif labels and len(diagram_labels) >= 3:
            page_figures.append(Block("figure", f"Diagram labels: {labels}", page_no, label, volume, article, list(state.path), doi_by_article.get(article)))
        yield from page_figures

        # Scanned page (no usable text layer): OCR when Tesseract is installed.
        if emitted == 0 and len(page_text_plain.strip()) < 80 and (image_boxes or page.get_drawings()):
            text = _ocr_page(page, ocr_language, tesseract_cmd)
            if text and len(text.strip()) > 40:
                report.pages_ocr += 1
                yield Block("ocr", normalize_text(text), page_no, label, volume, article, list(state.path), doi_by_article.get(article))
            else:
                report.pages_ocr_unavailable.append(page_no)

    doc.close()


def _shaded_boxes(page, width: float, height: float) -> list[tuple[float, float, float, float]]:
    boxes = []
    try:
        drawings = page.get_drawings()
    except Exception:
        return boxes
    for d in drawings:
        r, fill = d.get("rect"), d.get("fill")
        if r is None or fill is None or r.width < 150 or r.height < 30:
            continue
        if r.width > width * 0.95 and r.height > height * 0.9:  # page background
            continue
        if all(c > 0.98 for c in fill):  # white fill = not a visible box
            continue
        boxes.append((r.x0, r.y0, r.x1, r.y1))
    return boxes


def _contains(box, bbox, slack: float = 3.0) -> bool:
    return bbox[0] >= box[0] - slack and bbox[1] >= box[1] - slack and bbox[2] <= box[2] + slack and bbox[3] <= box[3] + slack


def _overlaps(a, b) -> bool:
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def _ref(title: str) -> str | None:
    m = CAPTION_RE.match(title)
    return f"{m.group(1)} {m.group(2)}" if m else None


def _nearest_caption(blocks: list[dict], bbox, word: str) -> str:
    """The 'Table N  Title' block closest above the table."""
    best, best_gap = "", 1e9
    for b in blocks:
        text, _, _ = _block_text(b, 5.0)
        if not text.startswith(word):
            continue
        gap = bbox[1] - b["bbox"][3]
        if -5 <= gap < best_gap:
            best, best_gap = normalize_text(text).replace("\n", " "), gap
    return best
