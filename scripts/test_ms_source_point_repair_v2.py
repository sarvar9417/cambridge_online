import runpy
import unittest

REPAIR = runpy.run_path(
    "backend/scripts/ms-source-point-repair-v2.py",
    run_name="ms_source_point_repair_v2_test",
)


class MarkSchemeSourcePointRepairV2Tests(unittest.TestCase):
    def derive(
        self,
        old,
        source,
        path="1.d.i",
        point_marks=1,
        scheme_marks=1,
        year=2021,
    ):
        return REPAIR["derive_point_repair_v2"](
            old, path, point_marks, scheme_marks, source, year
        )

    def test_removes_embedded_exact_question_path(self):
        old = (
            "calling function 3 times with correct data and outputting example code "
            "1 d i python print iterativeunknown"
        )
        source = (
            "calling function 3 times with correct data and outputting example code "
            "python print iterativeunknown"
        )
        result = self.derive(old, source)
        self.assertIsNotNone(result)
        self.assertEqual(
            result["newText"],
            "calling function 3 times with correct data and outputting example code python print iterativeunknown",
        )
        self.assertEqual(result["deletedTokens"], ["1", "d", "i"])

    def test_removes_embedded_path_and_one_standalone_mark_column_value(self):
        old = "correct statement 3 e ii 1 followed by exact source wording"
        source = "correct statement followed by exact source wording"
        result = self.derive(old, source, path="3.e.ii")
        self.assertIsNotNone(result)
        self.assertEqual(result["newText"], "correct statement followed by exact source wording")
        self.assertEqual(result["deletedTokens"], ["3", "e", "ii", "1"])

    def test_removes_terminal_published_footer_only_when_exact_source_proves_body(self):
        old = "screenshot showing the expected output Published 2023"
        source = "screenshot showing the expected output"
        result = self.derive(old, source, path="9.a")
        self.assertIsNotNone(result)
        self.assertTrue(result["removedPublishedFooter"])
        self.assertEqual(result["newText"], "screenshot showing the expected output")

    def test_does_not_strip_a_different_question_path(self):
        old = "correct statement 4 c ii exact wording"
        source = "correct statement exact wording"
        self.assertIsNone(self.derive(old, source, path="3.e.ii"))

    def test_does_not_delete_from_adjacent_numeric_data(self):
        old = "answer 3 e ii 1 1 0 1"
        source = "answer 1 0 1"
        self.assertIsNone(self.derive(old, source, path="3.e.ii"))

    def test_fails_closed_when_two_distinct_deletions_both_produce_source_phrases(self):
        old = "alpha 1 d i beta 1 gamma"
        source = "alpha beta 1 gamma and alpha beta gamma"
        self.assertIsNone(self.derive(old, source, path="1.d.i"))

    def test_footer_year_must_match_source_paper_year(self):
        old = "correct source wording Published 2022"
        source = "correct source wording"
        self.assertIsNone(self.derive(old, source, path="9.a", year=2023))

    def test_does_not_accept_semantic_paraphrase(self):
        old = "creates a safe backup 1 d i copy of the data"
        source = "stores a duplicate securely"
        self.assertIsNone(self.derive(old, source))


if __name__ == "__main__":
    unittest.main()
