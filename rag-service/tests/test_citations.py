from app.graph.citations import (
    cited_numbers,
    number_supported,
    numbers_in,
    page_reference,
    renumber,
    repair_draft,
    validate_draft,
    verbatim_quote,
)
from app.graph.schemas import Draft, DraftItem

PASSAGE = (
    "Late blight is caused by the oomycete Phytophthora infestans. Lesions appear as water-soaked spots "
    "that turn brown. Fungicide sprays are applied at 7-10 day intervals during wet weather. "
    "Nitrogen was applied at 1,000 kg per hectare in the trial."
)


def test_verbatim_quote_exact_and_snapped():
    assert verbatim_quote("Late blight is caused by the oomycete Phytophthora infestans.", PASSAGE)
    # A light paraphrase snaps to the real sentence instead of being kept.
    snapped = verbatim_quote("Late blight is caused by oomycete Phytophthora infestans", PASSAGE)
    assert snapped == "Late blight is caused by the oomycete Phytophthora infestans."
    assert verbatim_quote("Spray copper every day at noon for best results", PASSAGE) is None
    assert verbatim_quote("", PASSAGE) is None


def test_cited_numbers_parses_lists_and_ranges():
    assert cited_numbers("A [1]. B [2, 3]. C [4–6].") == [1, 2, 3, 4, 5, 6]


def test_numbers_and_support():
    assert numbers_in("1. Spray every 7 days [1]") == ["7"]
    assert number_supported("1000", [PASSAGE])  # "1,000" in the passage
    assert number_supported("৭", ["every 7 days"])  # Bangla digit
    assert not number_supported("25", [PASSAGE])


def test_validate_accepts_grounded_answer():
    draft = Draft(status="answered", answer="Late blight is caused by Phytophthora infestans [1]. Sprays are applied at 7-10 day intervals in wet weather [1].")
    assert validate_draft(draft, [PASSAGE]).ok


def test_validate_rejects_invented_dose_and_bad_citation():
    draft = Draft(status="answered", answer="Spray 5 ml neem oil per litre [1]. It is caused by Phytophthora infestans [2].")
    result = validate_draft(draft, [PASSAGE])
    assert not result.ok
    assert any("5" in e for e in result.errors)
    assert any("does not exist" in e for e in result.errors)
    repaired = repair_draft(draft, result)
    assert "5 ml" not in repaired.answer and "[2]" not in repaired.answer


def test_validate_rejects_uncited_numbers_and_uncited_answers():
    assert not validate_draft(Draft(status="answered", answer="Water 2 litres daily for best growth of tomatoes."), [PASSAGE]).ok
    assert not validate_draft(Draft(status="answered", answer="Tomatoes like sun and regular watering in summer."), [PASSAGE]).ok


def test_items_need_citations_and_source_terms():
    good = DraftItem(name="Late blight", source_term="Late blight", detail="Water-soaked spots that turn brown", citations=[1])
    invented = DraftItem(name="Tomato rust", source_term="tomato rust", detail="", citations=[1])
    uncited = DraftItem(name="Late blight", source_term="Late blight", citations=[])
    draft = Draft(status="answered", answer="", items=[good, invented, uncited])
    result = validate_draft(draft, [PASSAGE], require_source_terms=True)
    assert result.bad_items == {1, 2}
    assert [i.name for i in repair_draft(draft, result).items] == ["Late blight"]


def test_abstaining_drafts_are_not_validated():
    assert validate_draft(Draft(status="insufficient_evidence"), [PASSAGE]).ok


def test_renumber_orders_by_first_use():
    draft = Draft(status="answered", answer="A [3]. B [1, 3].", items=[DraftItem(name="x", citations=[3])])
    renumbered, order = renumber(draft)
    assert order == [3, 1]
    assert renumbered.answer == "A [1]. B [2, 1]."
    assert renumbered.items[0].citations == [1]


def test_page_reference_formats_printed_and_pdf_pages():
    assert page_reference("V1:37", "V1:37", 66, 66) == "Vol. 1, p. 37 (PDF p. 66)"
    assert page_reference("V2:10", "V2:11", 480, 481) == "Vol. 2, pp. 10–11 (PDF pp. 480–481)"
    assert page_reference(None, None, 5, 5) == "PDF p. 5"
