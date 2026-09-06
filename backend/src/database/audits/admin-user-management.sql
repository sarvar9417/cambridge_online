-- Admin user-management integrity audit.
--
-- This is intentionally read-only. Any returned row is something an owner
-- should inspect before relying on role/class management or irreversible purge.

-- A student is designed to have one active class. The management service moves
-- them by closing the previous enrolment before opening the next one.
select
  'student_multiple_active_classes' as finding,
  u.id as user_id,
  u.full_name,
  count(*)::int as active_classes
from users u
join enrollments e on e.student_id = u.id and e.left_at is null
where u.is_active = true and u.role = 'student'
group by u.id, u.full_name
having count(*) > 1;

-- Users promoted away from student must not keep an active student enrolment.
select
  'non_student_active_enrolment' as finding,
  u.id as user_id,
  u.full_name,
  u.role::text as role,
  c.id as class_id,
  c.name as class_name
from users u
join enrollments e on e.student_id = u.id and e.left_at is null
join classes c on c.id = e.class_id
where u.is_active = true and u.role <> 'student';

-- A student must not simultaneously remain in class_teachers.
select
  'student_teacher_membership' as finding,
  u.id as user_id,
  u.full_name,
  c.id as class_id,
  c.name as class_name
from users u
join class_teachers ct on ct.teacher_id = u.id
join classes c on c.id = ct.class_id
where u.is_active = true and u.role = 'student';

-- Suspended accounts should not have a refresh token that is still usable.
select
  'suspended_live_refresh_token' as finding,
  u.id as user_id,
  u.full_name,
  rt.id as refresh_token_id,
  rt.expires_at
from users u
join refresh_tokens rt on rt.user_id = u.id
where u.is_active = true
  and u.status = 'suspended'
  and rt.revoked_at is null
  and rt.expires_at > now();

-- Every active identity must retain at least one sign-in identifier.
select
  'user_without_identifier' as finding,
  u.id as user_id,
  u.full_name
from users u
where u.is_active = true and u.email is null and u.username is null;
