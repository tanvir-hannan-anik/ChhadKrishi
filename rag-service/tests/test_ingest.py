from pathlib import Path

import pytest

from app.ingest.chunker import Chunker
from app.ingest.metadata import tag, tag_query
from app.ingest.pdf_extract import Block, ExtractReport, iter_blocks, normalize_text


def block(text, page=10, sections=("Diseases",), kind="text", heading=False, article="Tomato"):
    return Block(kind, text, page, f"V1:{page}", "Part 1", article, list(sections), "10.1/x", is_heading=heading)


def test_normalize_text_fixes_ligatures_and_hyphenation():
    assert normalize_text("ﬁeld man-\nagement  of crops") == "field management of crops"


def test_metadata_tags_english_and_bangla():
    tags = tag("Late blight of tomato in the monsoon; apply compost and nitrogen to loam soils.")
    assert "tomato" in tags["crops"] and "blight" in tags["diseases"]
    assert "monsoon" in tags["seasons"] and "nitrogen" in tags["nutrients"] and "loam" in tags["soils"]
    q = tag_query("টমেটো গাছের পাতায় দাগ, বর্ষায় কী সার দেব?")
    assert q["crops"] == ["tomato"] and "monsoon" in q["seasons"] and "fertilizer" in q["nutrients"]


def test_metadata_does_not_tag_substrings():
    assert tag("The potassium content of grapefruit")["crops"] == []  # 'grape' is not a whole word here


def test_chunks_respect_section_boundaries_and_pages():
    para = "Sentence about blight on tomato leaves. " * 20  # ~800 chars
    blocks = [
        block("Diseases", heading=True),
        block(para, page=10),
        block(para, page=11),
        block("Pests", sections=("Pests",), heading=True),
        block("Aphids feed on sap and spread viruses. " * 10, page=11, sections=("Pests",)),
    ]
    chunks = list(Chunker("doc", target_chars=1000, overlap_chars=150).chunk(blocks))
    disease = [c for c in chunks if c.section == "Diseases"]
    pests = [c for c in chunks if c.section == "Pests"]
    assert disease and pests
    assert all("Aphids" not in c.content for c in disease)  # no chunk crosses a section boundary
    assert disease[0].page_start == 10 and disease[-1].page_end == 11
    assert pests[0].heading_path == "Tomato › Pests"
    assert disease[0].metadata["crops"] == ["tomato"]
    # Overlap: the second disease chunk starts with text from the end of the first.
    assert len(disease) >= 2
    assert disease[1].content.split(". ")[0] in disease[0].content


def test_chunk_ids_are_deterministic():
    blocks = [block("A paragraph about soil acidity and liming of crops. " * 8)]
    a = [c.id for c in Chunker("doc").chunk(blocks)]
    b = [c.id for c in Chunker("doc").chunk(blocks)]
    assert a == b and len(set(a)) == len(a)


def test_large_tables_split_by_rows_with_header():
    rows = "\n".join(f"|Crop {i}|{i * 10} kg/ha|" for i in range(120))
    table = block(f"Table 1 Fertilizer rates\n|Crop|Rate|\n|---|---|\n{rows}", kind="table")
    parts = list(Chunker("doc", max_chars=800).chunk([table]))
    assert len(parts) > 1
    assert all(p.chunk_type == "table" and p.content.startswith("Table 1 Fertilizer rates\n|Crop|Rate|") for p in parts)


@pytest.fixture
def sample_pdf(tmp_path: Path) -> Path:
    pymupdf = pytest.importorskip("pymupdf")
    doc = pymupdf.open()
    for n in range(3):
        page = doc.new_page(width=612, height=782)
        page.insert_text((300, 30), f"{n + 1}   Tomato Diseases", fontsize=9)  # running header
        if n == 0:
            page.draw_rect(pymupdf.Rect(67, 50, 545, 100), color=None, fill=(0.9, 0.9, 0.9))  # shaded glossary box
            page.insert_text((76, 64), "Glossary", fontsize=10, fontname="hebo")
            page.insert_text((76, 80), "Blight A disease that kills plant tissue rapidly.", fontsize=8.5)
            page.insert_text((72, 120), "Introduction", fontsize=10, fontname="hebo")
            page.insert_text((72, 140), "Tomato is grown widely. Late blight is a serious disease of tomato in wet weather.", fontsize=8.5)
            page.insert_text((72, 300), "Figure 1 Late blight lesions on a tomato leaf.", fontsize=8.5)
        elif n == 1:
            page.insert_text((72, 120), "Management", fontsize=10, fontname="hebo")
            page.insert_text((72, 140), "Remove infected leaves and avoid overhead irrigation.", fontsize=8.5)
    doc.set_toc([[1, "Part 1", 1], [2, "Tomato Diseases", 1], [3, "Introduction", 1], [3, "Management", 2], [3, "References", 3]])
    path = tmp_path / "sample.pdf"
    doc.save(path)
    return path


def test_extracts_sections_figures_and_skips_headers(sample_pdf):
    report = ExtractReport()
    blocks = list(iter_blocks(sample_pdf, report=report))
    texts = [b for b in blocks if b.kind == "text" and not b.is_heading]
    assert any("Late blight is a serious disease" in b.text and b.sections == ["Introduction"] for b in texts)
    assert any("Remove infected leaves" in b.text and b.sections == ["Management"] and b.page == 2 for b in texts)
    assert all("Tomato Diseases" not in b.text for b in texts)  # running header removed
    figures = [b for b in blocks if b.kind == "figure"]
    assert figures and figures[0].figure_ref == "Figure 1"
    assert report.pages_processed == 3 and report.figures == 1
    glossary = [b for b in texts if b.sections[-1:] == ["Glossary"]]
    assert glossary and "kills plant tissue" in glossary[0].text
    assert all("kills plant tissue" not in b.text for b in texts if b.sections[-1:] != ["Glossary"])
