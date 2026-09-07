import runpy
import unittest

AUDIT = runpy.run_path("backend/scripts/ms-source-audit-runner-v3.py", run_name="ms_source_audit_v3_test")


class MarkSchemeSourceAuditV3Tests(unittest.TestCase):
    def source(self):
        return {"sourcePaperId": "33333333-3333-4333-8333-333333333333", "sourceSha256": "abc123"}

    def scheme(self, **overrides):
        value = {
            "markSchemeId": "11111111-1111-4111-8111-111111111111",
            "questionId": "22222222-2222-4222-8222-222222222222",
            "path": "1.a",
            "displayRef": "9618/11/M/J/25 Q1(a)",
            "questionMarks": 2,
            "schemeType": "any_n_from_m",
            "maxMarks": 2,
            "guidanceMd": None,
            "extractConfidence": 0.98,
            "openQuestionFindings": 0,
            "openSchemeFindings": 0,
            "inUse": False,
            "groups": [{"id": "g1", "label": "main", "nRequired": 2, "marksPerPoint": 1, "maxMarks": 2}],
            "points": [
                {"code": "M1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
                {"code": "M2", "text": "prevents duplicate records", "marks": 1, "accept": [], "reject": [], "requires": ["M1"], "isBod": False, "sortOrder": 1},
            ],
            "levels": [],
        }
        value.update(overrides)
        return value

    def test_internal_group_label_and_point_dependency_are_not_source_phrases(self):
        section = {"page": 2, "marks": 2, "text": "uses a unique identifier\nprevents duplicate records"}
        result = AUDIT["audit_scheme_v3"](self.scheme(), section, self.source())
        self.assertEqual(result["result"], "verified")
        self.assertEqual(result["evidence"]["rubricPhrasesChecked"], 2)
        self.assertEqual(result["evidence"]["rubricPhrasesMatched"], 2)
        self.assertEqual(result["evidence"]["internalRequiresChecked"], 1)
        self.assertEqual(result["evidence"]["internalRequiresValid"], 1)
        self.assertEqual(result["evidence"]["matcherVersion"], "9618-ms-source-matcher-v3")

    def test_dangling_internal_dependency_still_fails_closed(self):
        points = [
            {"code": "M1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
            {"code": "M2", "text": "prevents duplicate records", "marks": 1, "accept": [], "reject": [], "requires": ["M9"], "isBod": False, "sortOrder": 1},
        ]
        section = {"page": 2, "marks": 2, "text": "uses a unique identifier prevents duplicate records"}
        result = AUDIT["audit_scheme_v3"](self.scheme(points=points), section, self.source())
        self.assertEqual(result["result"], "needs_review")
        self.assertIn("requires_point_missing", [r["code"] for r in result["evidence"]["reasons"]])

    def test_prose_requirement_remains_source_authoritative(self):
        points = [
            {"code": "M1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
            {"code": "M2", "text": "prevents duplicate records", "marks": 1, "accept": [], "reject": [], "requires": ["must refer to the primary key"], "isBod": False, "sortOrder": 1},
        ]
        section = {"page": 2, "marks": 2, "text": "uses a unique identifier prevents duplicate records"}
        result = AUDIT["audit_scheme_v3"](self.scheme(points=points), section, self.source())
        self.assertEqual(result["result"], "needs_review")
        self.assertIn("rubric_source_text_mismatch", [r["code"] for r in result["evidence"]["reasons"]])

    def test_legacy_row_path_and_marks_scaffolding_can_be_proved_from_exact_section(self):
        supported = AUDIT["supported_v3"]
        self.assertEqual(supported("1(c) 240 1", "240"), (True, "240"))
        self.assertEqual(supported("2(a)(i) -106 1", "-106"), (True, "-106"))

    def test_short_incidental_fragment_is_still_not_proof(self):
        self.assertEqual(AUDIT["supported_v3"]("1", "1 2 3 4"), (False, "1"))


if __name__ == "__main__":
    unittest.main()
