from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LiveChallengeFoundationTests(unittest.TestCase):
    def test_master_plan_preserves_cambridge_and_mark_scheme_contracts(self) -> None:
        plan = (ROOT / "docs/CAMBRIDGE-LIVE-CHALLENGE-MASTER-PLAN.md").read_text(encoding="utf-8")
        self.assertIn("Canonical question identity", plan)
        self.assertIn("Mark-scheme secrecy", plan)
        self.assertIn("Server-authoritative state", plan)
        self.assertIn("Anonymous peer marking", plan)
        self.assertIn("QUESTION_ACTIVE → ANSWERS_LOCKED → PEER_MARKING", plan)
        self.assertIn("Teacher create → Publish", plan)

    def test_schema_makes_self_marking_and_answer_rewrite_fail_closed(self) -> None:
        sql = (ROOT / "backend/src/database/migrations/0163_live_challenge_foundation.sql").read_text(
            encoding="utf-8"
        )
        lowered = sql.lower()
        self.assertIn("references questions", lowered)
        self.assertIn("mark_scheme_snapshot", lowered)
        self.assertIn("guard_locked_live_challenge_answer_v1", lowered)
        self.assertIn("live_challenge_answer_locked", lowered)
        self.assertIn("marker_student_id <> answer_student_id", lowered)
        self.assertIn("foreign key (answer_id, answer_student_id)", lowered)
        self.assertIn("unique (round_id, student_id)", lowered)
        self.assertIn("state_version", lowered)

    def test_active_join_code_is_six_character_and_unique(self) -> None:
        sql = (ROOT / "backend/src/database/migrations/0163_live_challenge_foundation.sql").read_text(
            encoding="utf-8"
        )
        self.assertIn("^[A-Z0-9]{6}$", sql)
        self.assertIn("live_challenges_active_join_code_idx", sql)
        self.assertIn("status NOT IN ('FINISHED', 'CANCELLED')", sql)


if __name__ == "__main__":
    unittest.main()
