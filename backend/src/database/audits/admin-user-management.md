# Admin user management audit

Run `admin-user-management.sql` after deploying changes to user roles, class placement, suspension or account lifecycle handling.

A healthy result is **zero rows from every query**. Findings cover multiple active classes for one student, active enrolments left on non-students, students left as class teachers, live refresh tokens for suspended users, and active accounts with no sign-in identifier.
