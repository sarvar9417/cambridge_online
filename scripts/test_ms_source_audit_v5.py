import runpy
import unittest

AUDIT = runpy.run_path("backend/scripts/ms-source-audit-runner-v5.py", run_name="ms_source_audit_v5_test")


class MarkSchemeSourceAuditV5Tests(unittest.TestCase):
    def source(self):
        return {"sourcePaperId": "33333333-3333-4333-8333-333333333333", "sourceSha256": "abc123"}

    def scheme(self, **overrides):
        value = {
            "markSchemeId": "11111111-1111-4111-8111-111111111111",
            "questionId": "22222222-2222-4222-8222-222222222222",
            "path": "6.b",
            "displayRef": "9618/11/M/J/22 Q6(b)",
            "questionMarks": 2,
            "schemeType": "any_n_from_m",
            "maxMarks": 2,
            "guidanceMd": None,
            "extractConfidence": 0.99,
            "promptVersion": "structured-v5-test",
            "openQuestionFindings": 0,
            "openSchemeFindings": 0,
            "inUse": False,
            "groups": [{"id": "g1", "label": "expansion", "nRequired": 2, "marksPerPoint": 1, "maxMarks": 2}],
            "points": [
                {"code": "I1", "groupId": "g1", "text": "identifies first item", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
                {"code": "E1", "groupId": "g1", "text": "explains first item", "marks": 1, "accept": [], "reject": [], "requires": ["I1"], "isBod": False, "sortOrder": 1},
                {"code": "I2", "groupId": "g1", "text": "identifies second item", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 2},
            ],
            "levels": [],
        }
        value.update(overrides)
        return value

    def test_group_label_is_internal_when_published_cap_and_points_are_proved(self):
        section = {
            "page": 3,
            "marks": 2,
            "text": "1 mark per point to max 2\nidentifies first item\nexplains first item\nidentifies second item",
        }
        result = AUDIT["audit_scheme_v5"](self.scheme(), section, self.source())
        self.assertEqual(result["result"], "verified")
        self.assertEqual(result["evidence"]["recoveredInternalGroupLabelsV5"], 1)
        self.assertEqual(result["evidence"]["recoveredInternalRequiresV5"], 1)
        self.assertEqual(result["evidence"]["matcherVersion"], "9618-ms-source-matcher-v5")

    def test_capped_pool_group_does_not_recover_without_published_cap(self):
        section = {
            "page": 3,
            "marks": 2,
            "text": "identifies first item\nexplains first item\nidentifies second item",
        }
        result = AUDIT["audit_scheme_v5"](self.scheme(), section, self.source())
        self.assertEqual(result["result"], "needs_review")
        self.assertEqual(result["evidence"]["recoveredInternalGroupLabelsV5"], 0)

    def test_requires_reference_is_internal_only_when_target_point_exists(self):
        scheme = self.scheme(
            schemeType="all_required",
            maxMarks=2,
            questionMarks=2,
            groups=[],
            points=[
                {"code": "I1", "groupId": None, "text": "identifies item", "marks": 1, "accept": [], "reject": [], "requires": [], "isBod": False, "sortOrder": 0},
                {"code": "E1", "groupId": None, "text": "explains item", "marks": 1, "accept": [], "reject": [], "requires": ["I1"], "isBod": False, "sortOrder": 1},
            ],
        )
        section = {"page": 3, "marks": 2, "text": "identifies item\nexplains item"}
        result = AUDIT["audit_scheme_v5"](scheme, section, self.source())
        self.assertEqual(result["result"], "verified")
        self.assertEqual(result["evidence"]["recoveredInternalRequiresV5"], 1)

        bad = dict(scheme)
        bad["points"] = [dict(item) for item in scheme["points"]]
        bad["points"][1]["requires"] = ["MISSING"]
        failed = AUDIT["audit_scheme_v5"](bad, section, self.source())
        self.assertEqual(failed["result"], "needs_review")
        self.assertEqual(failed["evidence"]["recoveredInternalRequiresV5"], 0)


if __name__ == "__main__":
    unittest.main()
