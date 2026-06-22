# RLS follow-up design (not applied)

This directory intentionally contains no executable policy SQL. The current
browser client uses a locally generated identity rather than Supabase Auth, so
enabling RLS now would block the application without establishing trustworthy
ownership.

Before writing an RLS migration:

1. Enable Supabase Anonymous Sign-Ins and store `auth.uid()` in
   `rooms.host_id`, `participants.user_id`, and `reservations.user_id`.
2. Move membership checks into `security definer` helper functions owned by a
   non-login role, set an explicit `search_path`, and revoke public execution.
   Do not make `rooms` and `participants` policies query each other directly;
   that creates recursive policy evaluation.
3. Add policies for reservation and session writes and test host, member,
   outsider, and unauthenticated access against a disposable local database.
4. Only then add the reviewed SQL under `supabase/migrations/`.

The integrity/index migration in `supabase/migrations/` is independent of this
follow-up and must still be preflighted before deployment. No database changes
are performed by this repository refactor.
