# Admin user management audit

Run `admin-user-management.sql` after deploying changes to user roles, class placement, suspension or account lifecycle handling.

A healthy result is **zero rows from every query**. Findings cover:

- a student with more than one active class;
- a non-student left with an active student enrolment;
- a student left in `class_teachers`;
- a suspended user with a live refresh token;
- an active identity with neither email nor username;
- an active account with no school;
- a student whose active class belongs to a different school;
- a teacher whose class membership belongs to a different school.

These checks complement the API/service authorization layer. They are intended to catch legacy data, manual SQL changes or future regressions that bypass normal application flows.
