import runpy
import unittest

AUDIT = runpy.run_path("backend/scripts/ms-source-audit-runner.py", run_name="ms_source_audit_test")


class MarkSchemeSourceAuditTests(unittest.TestCase):
    def scheme(self, **overrides):
        value = {
            "markSchemeId": "11111111-1111-4111-8111-111111111111",
            "questionId": "22222222-2222-4222-8222-222222222222",
            "path": "1.a",
            "displayRef": "9618/11/M/J/25 Q1(a)",
            "questionMarks": 2,
            "schemeType": "all_required",
            "maxMarks": 2,
            "guidanceMd": None,
            "extractConfidence": 0.98,
            "promptVersion": "extract-markscheme.v2",
            "openQuestionFindings": 0,
            "openSchemeFindings": 0,
            "inUse": False,
            "groups": [],
            "points": [
                {"code": "MP1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
                {"code": "MP2", "text": "prevents duplicate records", "marks": 1, "accept": ["no two records share the same value"], "reject": [], "requires": [], "isBod": False, "sortOrder": 1},
            ],
            "levels": [],
        }
        value.update(overrides)
        return value

    def source(self):
        return {"sourcePaperId": "33333333-3333-4333-8333-333333333333", "sourceSha256": "abc123"}

    def test_parser_segments_source_rows_and_preserves_page(self):
        pages = [[
            "Question Answer Marks",
            "1(a) uses a unique identifier 2",
            "prevents duplicate records",
            "no two records share the same value",
            "1(b) Any two from: 2",
            "first valid point",
        ], [
            "2 Another question 1",
            "second page body",
        ]]
        sections = AUDIT["parse_sections"](pages)
        self.assertEqual(sections["1.a"]["marks"], 2)
        self.assertEqual(sections["1.a"]["page"], 1)
        self.assertIn("prevents duplicate records", sections["1.a"]["text"])
        self.assertEqual(sections["2"]["page"], 2)

    def test_clean_structured_rubric_source_backing_verifies(self):
        section = {
            "page": 3,
            "marks": 2,
            "text": "uses a unique identifier\nprevents duplicate records // no two records share the same value",
        }
        result = AUDIT["audit_scheme"](self.scheme(), section, self.source())
        self.assertEqual(result["auditVersion"], "9618-ms-source-audit-v2")
        self.assertEqual(result["result"], "verified")
        self.assertTrue(result["evidence"]["strict"])
        self.assertEqual(result["sourcePage"], 3)
        self.assertEqual(result["evidence"]["rubricPhrasesChecked"], 3)
        self.assertEqual(result["evidence"]["rubricPhrasesMatched"], 3)

    def test_missing_rubric_phrase_fails_closed(self):
        section = {"page": 1, "marks": 2, "text": "uses a unique identifier\nprevents duplicate records"}
        result = AUDIT["audit_scheme"](self.scheme(), section, self.source())
        self.assertEqual(result["result"], "needs_review")
        codes = [item["code"] for item in result["evidence"]["reasons"]]
        self.assertIn("rubric_source_text_mismatch", codes)

    def test_guidance_representation_mismatch_is_warning_not_grading_failure(self):
        section = {"page": 1, "marks": 2, "text": "uses a unique identifier prevents duplicate records no two records share the same value"}
        scheme = self.scheme(guidanceMd="1(a) award one mark for each correct point; legacy rendered footer text")
        result = AUDIT["audit_scheme"](scheme, section, self.source())
        self.assertEqual(result["result"], "verified")
        self.assertTrue(result["evidence"]["strict"])
        self.assertFalse(result["evidence"]["guidanceMatched"])
        self.assertEqual(result["evidence"]["reasons"], [])
        self.assertIn("guidance_representation_mismatch", [item["code"] for item in result["evidence"]["warnings"]])

    def test_requires_is_grading_authoritative_and_must_be_source_backed(self):
        points = [
            {"code": "MP1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
            {"code": "MP2", "text": "prevents duplicate records", "marks": 1, "accept": [], "reject": [], "requires": ["must refer to the primary key"], "isBod": False, "sortOrder": 1},
        ]
        section = {"page": 1, "marks": 2, "text": "uses a unique identifier prevents duplicate records"}
        result = AUDIT["audit_scheme"](self.scheme(points=points), section, self.source())
        self.assertEqual(result["result"], "needs_review")
        self.assertIn("rubric_source_text_mismatch", [item["code"] for item in result["evidence"]["reasons"]])

    def test_manual_low_confidence_and_in_use_never_auto_approve(self):
        section = {"page": 1, "marks": 2, "text": "uses a unique identifier prevents duplicate records no two records share the same value"}
        result = AUDIT["audit_scheme"](
            self.scheme(schemeType="manual_only", extractConfidence=0.7, inUse=True), section, self.source()
        )
        codes = {item["code"] for item in result["evidence"]["reasons"]}
        self.assertTrue({"manual_only", "low_extract_confidence", "question_in_use"}.issubset(codes))
        self.assertFalse(result["evidence"]["strict"])

    def test_all_required_mark_sum_is_a_hard_gate(self):
        bad = self.scheme(points=[{"code": "MP1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0}])
        section = {"page": 1, "marks": 2, "text": "uses a unique identifier"}
        result = AUDIT["audit_scheme"](bad, section, self.source())
        codes = [item["code"] for item in result["evidence"]["reasons"]]
        self.assertIn("point_mark_sum_mismatch", codes)

    def test_short_incidental_fragments_are_not_proof(self):
        self.assertEqual(AUDIT["supported"]("1", "1 2 3 4"), (False, "1"))


if __name__ == "__main__":
    unittest.main()
