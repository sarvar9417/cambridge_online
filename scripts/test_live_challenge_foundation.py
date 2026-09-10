from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "backend/src/database/migrations/0166_live_challenge_foundation.sql"


class LiveChallengeFoundationTests(unittest.TestCase):
    def test_master_plan_preserves_cambridge_and_mark_scheme_contracts(self) -> None:
        plan = (ROOT / "docs/CAMBRIDGE-LIVE-CHALLENGE-MASTER-PLAN.md").read_text(encoding="utf-8")
        self.assertIn("Canonical question identity", plan)
        self.assertIn("Mark-scheme secrecy", plan)
        self.assertIn("Server-authoritative state", plan)
        self.assertIn("Anonymous peer marking", plan)
        self.assertIn("QUESTION_ACTIVE → ANSWERS_LOCKED → PEER_MARKING", plan)
        self.assertIn("Teacher create → Publish", plan)

    def test_schema_makes_cross_challenge_links_self_marking_and_answer_rewrite_fail_closed(self) -> None:
        sql = MIGRATION.read_text(encoding="utf-8")
        lowered = sql.lower()
        self.assertIn("references questions", lowered)
        self.assertIn("mark_scheme_snapshot", lowered)
        self.assertIn("foreign key (challenge_question_id, challenge_id)", lowered)
        self.assertIn("references live_challenge_questions (id, challenge_id)", lowered)
        self.assertIn("guard_live_challenge_answer_membership_v1", lowered)
        self.assertIn("live_challenge_answer_participant_invalid", lowered)
        self.assertIn("guard_locked_live_challenge_answer_v1", lowered)
        self.assertIn("live_challenge_answer_locked", lowered)
        self.assertIn("marker_student_id <> answer_student_id", lowered)
        self.assertIn("foreign key (answer_id, round_id, answer_student_id)", lowered)
        self.assertIn("references live_challenge_answers (id, round_id, student_id)", lowered)
        self.assertIn("guard_live_challenge_peer_marker_membership_v1", lowered)
        self.assertIn("live_challenge_peer_marker_participant_invalid", lowered)
        self.assertIn("foreign key (answer_id, round_id)", lowered)
        self.assertIn("unique (round_id, student_id)", lowered)
        self.assertIn("state_version", lowered)

    def test_active_join_code_is_six_character_and_unique(self) -> None:
        sql = MIGRATION.read_text(encoding="utf-8")
        self.assertIn("^[A-Z0-9]{6}$", sql)
        self.assertIn("live_challenges_active_join_code_idx", sql)
        self.assertIn("status NOT IN ('FINISHED', 'CANCELLED')", sql)

    def test_public_database_surface_is_explicitly_fail_closed(self) -> None:
        sql = MIGRATION.read_text(encoding="utf-8").lower()
        tables = (
            "live_challenges",
            "live_challenge_questions",
            "live_challenge_participants",
            "live_challenge_rounds",
            "live_challenge_answers",
            "live_challenge_peer_assignments",
            "live_challenge_peer_marks",
            "live_challenge_score_overrides",
            "live_challenge_events",
        )
        for table in tables:
            self.assertIn(
                f"alter table public.{table} enable row level security;",
                sql,
            )
        self.assertIn("from public, anon, authenticated;", sql)
        self.assertIn("revoke all on sequence public.live_challenge_events_id_seq", sql)
        self.assertIn("to service_role;", sql)
        for function in (
            "guard_live_challenge_answer_membership_v1",
            "guard_locked_live_challenge_answer_v1",
            "guard_live_challenge_peer_marker_membership_v1",
        ):
            self.assertIn(f"revoke all on function public.{function}()", sql)


if __name__ == "__main__":
    unittest.main()
