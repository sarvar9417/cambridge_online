ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS source_mark_scheme_point_id uuid REFERENCES mark_scheme_points ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS flashcard_decks_subtopic_title_idx
  ON flashcard_decks(subtopic_id,title);

CREATE UNIQUE INDEX IF NOT EXISTS flashcards_deck_source_point_idx
  ON flashcards(deck_id,source_mark_scheme_point_id)
  WHERE source_mark_scheme_point_id IS NOT NULL;
