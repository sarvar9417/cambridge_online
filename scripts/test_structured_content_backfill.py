import runpy
import unittest

MODULE = runpy.run_path('backend/scripts/structured_content_backfill.py', run_name='structured_content_backfill_test_lib')
source_matches_stem = MODULE['source_matches_stem']
parse_markdown_table = MODULE['parse_markdown_table']
build_blocks = MODULE['build_blocks']
prefixes = MODULE['prefixes']


class StructuredContentBackfillTests(unittest.TestCase):
    def test_source_match_ignores_pdf_line_wrapping(self):
        source = 'Explain why the processor uses a cache.\nYour answer should refer to speed.'
        self.assertTrue(source_matches_stem('Explain why the processor uses a cache. Your answer should refer to speed.', source))

    def test_source_match_does_not_accept_unrelated_stem(self):
        self.assertFalse(source_matches_stem('State two benefits of encryption.', 'Describe how a parity check detects an error.'))

    def test_markdown_table_becomes_semantic_grid(self):
        parsed = parse_markdown_table('| A | B | X |\n| --- | --- | --- |\n| 0 | 0 |   |\n| 0 | 1 | ... |')
        self.assertIsNotNone(parsed)
        headers, rows, editable = parsed
        self.assertEqual(headers, ['A', 'B', 'X'])
        self.assertEqual(rows[0], ['0', '0', None])
        self.assertIn([0, 2], editable)
        self.assertIn([1, 2], editable)

    def test_visual_asset_is_source_pinned(self):
        leaf = {
            'stemMd': 'Complete the logic circuit.',
            'assets': [{
                'id': '11111111-1111-4111-8111-111111111111',
                'kind': 'diagram',
                'altText': 'Logic circuit',
                'sourcePage': 4,
                'sortOrder': 0,
            }],
        }
        blocks, error = build_blocks(leaf, 4)
        self.assertIsNone(error)
        self.assertEqual(blocks[1]['type'], 'asset')
        self.assertEqual(blocks[1]['kind'], 'logic_circuit')
        self.assertEqual(blocks[1]['source']['page'], 4)

    def test_missing_asset_page_fails_closed(self):
        leaf = {
            'stemMd': 'Use the diagram.',
            'assets': [{
                'id': '11111111-1111-4111-8111-111111111111',
                'kind': 'diagram',
                'altText': 'Diagram',
                'sourcePage': None,
                'sortOrder': 0,
            }],
        }
        blocks, error = build_blocks(leaf, 2)
        self.assertIsNone(blocks)
        self.assertEqual(error, 'asset_source_page_missing')

    def test_nested_paths_include_parent_events(self):
        self.assertEqual(prefixes(['4.b.ii']), {'4', '4.b', '4.b.ii'})


if __name__ == '__main__':
    unittest.main()
