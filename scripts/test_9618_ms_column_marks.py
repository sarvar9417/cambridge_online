from __future__ import annotations

import runpy
import unittest

MODULE = runpy.run_path(
    "backend/scripts/ms_column_marks.py",
    run_name="test_9618_ms_column_marks",
)
printed_mark_columns = MODULE["printed_mark_columns"]


class PrintedMarkColumnTests(unittest.TestCase):
    def test_guidance_number_does_not_override_printed_mark(self):
        header = "  Question" + " " * 22 + "Answer" + " " * 29 + "Marks" + " " * 9 + "Guidance"
        marks_start = header.index("Marks")
        guidance_start = header.index("Guidance")
        prefix = "  4(c)(ii)"
        row = prefix + " " * max(1, marks_start - len(prefix)) + "  3" + " " * max(1, guidance_start - (marks_start + 3)) + "Award a maximum of 2 marks"
        result = printed_mark_columns(header + "\n" + row + "\f")
        self.assertEqual(result["4.c.ii"], 3)

    def test_multiple_pages_use_their_own_column_geometry(self):
        page1_header = " Question      Answer                    Marks    Guidance"
        m1 = page1_header.index("Marks")
        prefix1 = " 1(a)"
        page1_row = prefix1 + " " * max(1, m1 - len(prefix1)) + "  2"

        page2_header = " Question          Answer                         Marks       Guidance"
        m2 = page2_header.index("Marks")
        g2 = page2_header.index("Guidance")
        prefix2 = " 2(b)(iii)"
        page2_row = prefix2 + " " * max(1, m2 - len(prefix2)) + "  5" + " " * max(1, g2 - (m2 + 3)) + "max 3 if order wrong"
        result = printed_mark_columns(page1_header + "\n" + page1_row + "\f" + page2_header + "\n" + page2_row)
        self.assertEqual(result["1.a"], 2)
        self.assertEqual(result["2.b.iii"], 5)

    def test_guidance_only_number_is_not_a_mark(self):
        header = " Question      Answer                    Marks    Guidance"
        guidance = header.index("Guidance")
        prefix = " 3(a)          answer text"
        row = prefix + " " * max(1, guidance - len(prefix)) + "Award 2 if complete"
        result = printed_mark_columns(header + "\n" + row)
        self.assertNotIn("3.a", result)


if __name__ == "__main__":
    unittest.main()
