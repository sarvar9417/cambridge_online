import runpy
import unittest

AUDIT = runpy.run_path("backend/scripts/ms-source-audit-runner-v4.py", run_name="ms_source_audit_v4_test")


class MarkSchemeSourceAuditV4Tests(unittest.TestCase):
    def source(self):
        return {"sourcePaperId": "33333333-3333-4333-8333-333333333333", "sourceSha256": "abc123"}

    def scheme(self, **overrides):
        value = {
            "markSchemeId": "11111111-1111-4111-8111-111111111111",
            "questionId": "22222222-2222-4222-8222-222222222222",
            "path": "1.a",
            "displayRef": "9618/11/M/J/21 Q1(a)",
            "questionMarks": 2,
            "schemeType": "any_n_from_m",
            "maxMarks": 2,
            "guidanceMd": None,
            "extractConfidence": 0.99,
            "promptVersion": "atomic-published-numbered-pool-v1",
            "openQuestionFindings": 0,
            "openSchemeFindings": 0,
            "inUse": False,
            "groups": [{"id": "g1", "label": "published mark points", "nRequired": 2, "marksPerPoint": 1, "maxMarks": 2}],
            "points": [
                {"code": "M1", "groupId": "g1", "text": "uses a unique identifier", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
                {"code": "M2", "groupId": "g1", "text": "prevents duplicate records", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 1},
                {"code": "M3", "groupId": "g1", "text": "supports efficient searching", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 2},
            ],
            "levels": [],
        }
        value.update(overrides)
        return value

    def test_generated_group_label_is_internal_only_when_source_proves_pool_cap(self):
        section = {
            "page": 3,
            "marks": 2,
            "text": "1 mark per point to max 2\nuses a unique identifier\nprevents duplicate records\nsupports efficient searching",
        }
        result = AUDIT["audit_scheme_v4"](self.scheme(), section, self.source())
        self.assertEqual(result["result"], "verified")
        self.assertEqual(result["evidence"]["recoveredInternalGroupLabels"], 1)
        self.assertEqual(result["evidence"]["rubricPhrasesChecked"], 3)
        self.assertEqual(result["evidence"]["rubricPhrasesMatched"], 3)

    def test_capped_pool_without_printed_cap_fails_closed(self):
        section = {
            "page": 3,
            "marks": 2,
            "text": "uses a unique identifier\nprevents duplicate records\nsupports efficient searching",
        }
        result = AUDIT["audit_scheme_v4"](self.scheme(), section, self.source())
        self.assertEqual(result["result"], "needs_review")
        self.assertIn("rubric_source_text_mismatch", [r["code"] for r in result["evidence"]["reasons"]])

    def test_punctuation_only_difference_is_exact_token_proof(self):
        self.assertTrue(AUDIT["supported_v4"]("data is retained // non-volatile storage", "data is retained / non-volatile storage")[0])

    def test_short_numeric_answer_is_exact_section_proof(self):
        self.assertEqual(AUDIT["supported_v4"]("252", "252"), (True, "252"))
        self.assertFalse(AUDIT["supported_v4"]("25", "1250")[0])

    def test_spaced_binary_answer_is_exact_section_proof(self):
        self.assertTrue(AUDIT["supported_v4"]("11010100", "1 1 0 1 0 1 0 0")[0])
        self.assertFalse(AUDIT["supported_v4"]("11010100", "1 1 0 1 0 1 0 1")[0])

    def test_semantic_paraphrase_is_not_accepted(self):
        self.assertFalse(AUDIT["supported_v4"]("stores a duplicate safely", "creates a backup copy of the original data")[0])

    def test_legacy_confidence_is_superseded_only_after_complete_source_proof(self):
        scheme = self.scheme(
            schemeType="all_required",
            maxMarks=1,
            questionMarks=1,
            extractConfidence=0.82,
            groups=[],
            points=[{"code": "M1", "groupId": None, "text": "run-length encoding", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0}],
        )
        section = {"page": 3, "marks": 1, "text": "run-length encoding"}
        result = AUDIT["audit_scheme_v4"](scheme, section, self.source())
        self.assertEqual(result["result"], "verified")
        self.assertTrue(result["evidence"]["legacyConfidenceSuperseded"])

        bad = dict(scheme)
        bad["points"] = [{"code": "M1", "groupId": None, "text": "semantic rewrite not printed", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0}]
        failed = AUDIT["audit_scheme_v4"](bad, section, self.source())
        self.assertEqual(failed["result"], "needs_review")
        self.assertFalse(failed["evidence"]["legacyConfidenceSuperseded"])

    def test_parser_fallback_requires_exact_path_and_right_hand_mark_column(self):
        pages = [[
            "Question Answer                                                        Marks",
            "6(b)(i) preceding answer                                                  5",
            "6(b)(ii) FALSE                                                            1",
            "7(a)(i) next question                                                     7",
        ]]
        scheme = self.scheme(path="6.b.ii", maxMarks=1, questionMarks=1)
        section = AUDIT["resolve_section_v4"](scheme, pages, {})
        self.assertIsNotNone(section)
        self.assertEqual(section["marks"], 1)
        self.assertTrue(section["parserFallback"])
        self.assertIn("FALSE", section["text"])

    def test_parser_fallback_does_not_use_incidental_body_digit_as_mark(self):
        pages = [[
            "6(b)(ii) FALSE",
            "the answer contains the number 1 but no right hand marks column",
            "7(a) next question                                                         2",
        ]]
        scheme = self.scheme(path="6.b.ii", maxMarks=1, questionMarks=1)
        self.assertIsNone(AUDIT["resolve_section_v4"](scheme, pages, {}))


if __name__ == "__main__":
    unittest.main()
