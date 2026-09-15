-- Cover every live-exam foreign key that is not already the leading column of
-- a primary, unique or hot-path index. This keeps deletes/moderation lookups
-- predictable as the session history grows.

CREATE INDEX live_exam_questions_question_idx
  ON live_exam_questions (question_id);

CREATE INDEX live_exam_participants_student_idx
  ON live_exam_participants (student_id);

CREATE INDEX live_exam_answers_participant_idx
  ON live_exam_answers (participant_id);
CREATE INDEX live_exam_answers_moderated_by_idx
  ON live_exam_answers (moderated_by)
  WHERE moderated_by IS NOT NULL;

CREATE INDEX live_exam_reviews_answer_idx
  ON live_exam_reviews (answer_id);
CREATE INDEX live_exam_reviews_moderated_by_idx
  ON live_exam_reviews (moderated_by)
  WHERE moderated_by IS NOT NULL;

CREATE INDEX live_exam_events_actor_idx
  ON live_exam_events (actor_id)
  WHERE actor_id IS NOT NULL;
