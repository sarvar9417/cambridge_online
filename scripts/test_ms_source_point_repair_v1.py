import runpy
import unittest

REPAIR = runpy.run_path(
    "backend/scripts/ms-source-point-repair-v1.py",
    run_name="ms_source_point_repair_v1_test",
)


class MarkSchemeSourcePointRepairV1Tests(unittest.TestCase):
    def derive(self, old, source, path="3.c.ii", point_marks=1, scheme_marks=1):
        return REPAIR["derive_point_repair"](
            old, path, point_marks, scheme_marks, source
        )

    def test_removes_exact_path_and_one_internal_mark_column_integer(self):
        old = (
            "3 c ii 1 mark for correct answer 1 the number is divided by 8 "
            "and only whole number retained"
        )
        source = (
            "1 mark for correct answer the number is divided by 8 "
            "and only whole number retained"
        )
        result = self.derive(old, source)
        self.assertIsNotNone(result)
        self.assertEqual(
            result["newText"],
            "1 mark for correct answer the number is divided by 8 and only whole number retained",
        )
        self.assertEqual(result["deletedMarkTokens"], ["1"])
        self.assertEqual(result["pathPrefixTokens"], ["3", "c", "ii"])

    def test_path_only_cleanup_requires_full_exact_source_substring(self):
        old = "3 c i 1 1 1 0 1 0 1 0 0"
        source = "1 1 1 0 1 0 1 0 0"
        result = self.derive(old, source, path="3.c.i")
        self.assertIsNotNone(result)
        self.assertEqual(result["newText"], "1 1 1 0 1 0 1 0 0")
        self.assertEqual(result["deletedMarkTokens"], [])

    def test_does_not_strip_a_different_question_path(self):
        old = "4 c ii correct source wording"
        source = "correct source wording"
        self.assertIsNone(self.derive(old, source, path="3.c.ii"))

    def test_does_not_delete_from_adjacent_numeric_sequences(self):
        old = "3 c ii output is 1 1 0 1"
        source = "output is 1 0 1"
        self.assertIsNone(self.derive(old, source))

    def test_fails_closed_when_two_different_integer_deletions_are_source_proved(self):
        old = "3 c ii 1 alpha 1 beta"
        source = "alpha 1 beta and also 1 alpha beta"
        self.assertIsNone(self.derive(old, source))

    def test_does_not_accept_semantic_paraphrase(self):
        old = "3 c ii creates a backup copy of the original data"
        source = "stores a duplicate safely"
        self.assertIsNone(self.derive(old, source))


if __name__ == "__main__":
    unittest.main()
