# Login pool exhaustion incident — 2026-08-28

## Symptom

Production login returned the generic internal error message.

## Runtime evidence

Vercel production runtime errors reported:

`EMAXCONNSESSION max clients reached in session mode - max clients are limited to pool_size: 15`

The error occurred in `PgAuthRepository.findByIdentifier` during `/api/v1/auth/login`, and also affected refresh/grading routes.

## Root cause

The Vercel serverless function used the Supabase Supavisor session-mode pooler. Multiple warm/concurrent serverless instances can each retain PostgreSQL clients, exhausting the 15-session project pool. The app also issues several API requests in parallel after authentication, making the limit easy to hit.

## Fix

- On Vercel only, a Supabase pooler URL on port 5432 is normalized to port 6543 (Supavisor transaction mode).
- Each Vercel function pool is capped at one PostgreSQL client.
- Vercel idle timeout is reduced to one second.
- Direct/local database URLs are not rewritten.
- Regression tests cover URL normalization.

No user credentials, passwords, account status, or authentication rules are changed by this fix.
