# Supabase migration reconciliation

This runbook records the reviewed migration state and deployment procedure for Zepbound tracking.

## Audited baseline

The linked production project was reconciled and verified through migration 010. On 2026-07-16, `supabase migration list --linked` showed local and remote versions 001–010 aligned, with only `011_zepbound_atomic_daily_symptoms.sql` pending.

The following production differences are accepted as the canonical application schema and are encoded by `009_reconcile_legacy_schema.sql`:

- `saved_meals.serving_size` is `TEXT`, because serving sizes may be human-entered labels.
- `food_logs.meal_time` is `TIME`, with the detailed eating-window comment retained.
- `supplement_logs.user_supplement_id` is nullable and references `user_supplements(id) ON DELETE SET NULL`, preserving historical intake rows when a supplement definition is removed.
- Compatible additions already present in production, including soft-delete fields and later additive migrations, are not removed.

The audit also found two overbroad `food-photos` storage policies. Migration 009 drops exactly `Authenticated upload food-photos` and `Public read food-photos`, then retains/recreates authenticated upload, read, and delete policies restricted to the user's own top-level UUID folder. The existing `Service delete food-photos` policy is intentionally preserved. `storage.objects` is platform-managed and already has RLS enabled, so the migration changes policies without attempting to alter that table. The application creates signed URLs, and the analysis Edge Function continues to use its service-role storage client.

## Apply migration 011

Do not run this casually or as part of the web deployment. Use an operator with linked-project database authority, keep an audit transcript, and stop on any unexpected output.

1. Take a managed database backup and capture the current schema, policy catalog, and remote migration list.
2. Run `supabase migration list --linked`. Require local and remote versions 001–010 to be aligned and only `011_zepbound_atomic_daily_symptoms.sql` to be pending. If the ledger or schema differs from this audited state, stop for review.
3. Run `supabase db push --linked --dry-run`. Review that only migration 011 will run and stop if any other migration or unexpected destructive statement appears. Migration 011 intentionally deletes only a contradictory `None` sentinel when that same user/date already has a real symptom.
4. Apply migration 011 once with `supabase db push --linked`.
5. Verify that the remote ledger contains 001–011, both Zepbound tables retain RLS and owner-only policies, and the authenticated-only atomic symptom RPC and None-exclusivity trigger exist. Confirm the RPC is unavailable to anonymous callers and do not add fake production health data.

These commands were validated against Supabase CLI 2.100.1. Re-check `db push --help` if the operator uses a different version. Do not use `migration repair` for migration 011; apply it normally so its SQL executes.

## Rollback and recovery

- Never mark migration 011 reverted as a substitute for a schema rollback. If the applied migration causes an issue, stop writes if necessary and use a reviewed forward-fix/down migration or restore the managed backup.
- Preserve all real health, food, supplement, and storage data. Do not drop live tables or buckets to make migration history match.

Web deployment remains governed by `docs/DEPLOYMENT.md`. Database reconciliation is a separate, explicitly reviewed operator action and must be complete before deploying UI that depends on Zepbound tables.
