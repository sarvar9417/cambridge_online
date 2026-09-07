import runpy
import unittest

V6 = runpy.run_path(
    "backend/scripts/ms-source-audit-runner-v6.py",
    run_name="ms_source_audit_v6_test",
)


class MarkSchemeSourceAuditV6Tests(unittest.TestCase):
    def test_unique_three_letter_literal_is_source_proved(self):
        self.assertEqual(V6["supported_v6"]("LAN", "Answer: LAN"), (True, "lan"))
        self.assertEqual(V6["supported_v6"]("hub", "Use a hub here"), (True, "hub"))

    def test_short_generic_word_is_not_proved_when_repeated(self):
        ok, key = V6["supported_v6"]("or", "Use AND or OR, or another valid gate")
        self.assertFalse(ok)
        self.assertEqual(key, "or")

    def test_short_identifier_and_numeric_expression_require_exact_source(self):
        self.assertEqual(V6["supported_v6"]("F2", "The answer is F2"), (True, "f2"))
        self.assertEqual(V6["supported_v6"]("5 - 2", "Result: 5 - 2"), (True, "5 - 2"))
        self.assertFalse(V6["supported_v6"]("5 - 2", "Result: 5 + 2")[0])

    def test_operator_list_requires_exact_unique_occurrence(self):
        self.assertEqual(V6["supported_v6"]("+ - /", "Operators accepted: + - /"), (True, "+ - /"))
        self.assertFalse(V6["supported_v6"]("+ - /", "Use + - / here and + - / there")[0])

    def test_edge_ellipsis_can_be_trimmed_but_internal_text_cannot(self):
        self.assertEqual(V6["supported_v6"]("XOR...", "Answer XOR"), (True, "xor"))
        self.assertEqual(V6["supported_v6"]("... 255", "Maximum value 255"), (True, "255"))
        self.assertFalse(V6["supported_v6"]("X...OR", "Answer XOR")[0])

    def test_relaxed_path_reads_official_malformed_parentheses(self):
        self.assertEqual(
            V6["_relaxed_printed_path"]("3(b(iii) One mark for screenshot with Royal   1"),
            "3.b.iii",
        )
        self.assertEqual(
            V6["_relaxed_printed_path"]("3(c)(i) One mark each:   2"),
            "3.c.i",
        )
        self.assertIsNone(V6["_relaxed_printed_path"]("9618/42 Cambridge International"))

    def test_resolve_section_recovers_malformed_path_only_with_mark_proof(self):
        scheme = {"path": "3.b.iii", "maxMarks": 1}
        pages = [[
            "3(b(iii) One mark for screenshot with Royal, 4 years, 77 intelligence e.g.     1",
            "3(c)(i) One mark each:                                                     2",
        ]]
        result = V6["resolve_section_v6"](scheme, pages, {})
        self.assertIsNotNone(result)
        self.assertEqual(result["page"], 1)
        self.assertEqual(result["marks"], 1)
        self.assertTrue(result["parserFallbackV6"])
        self.assertIn("Royal", result["text"])

    def test_resolve_section_fails_closed_without_mark_proof(self):
        scheme = {"path": "3.b.iii", "maxMarks": 2}
        pages = [[
            "3(b(iii) screenshot with Royal",
            "3(c)(i) One mark each:                                                     2",
        ]]
        self.assertIsNone(V6["resolve_section_v6"](scheme, pages, {}))


if __name__ == "__main__":
    unittest.main()
