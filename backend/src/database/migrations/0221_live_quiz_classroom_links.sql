-- Scope auto-discovered Live Quiz links to the classroom selected by the host.
-- Existing rooms keep working with a PIN; they are not broadcast to students.
ALTER TABLE public.live_quiz_rooms
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS live_quiz_classroom_discovery_idx
  ON public.live_quiz_rooms(class_id, created_at DESC)
  WHERE status IN ('waiting', 'active', 'review');
