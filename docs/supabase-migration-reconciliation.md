# Supabase migration reconciliation

This runbook records the reviewed migration state and deployment procedure for Zepbound tracking.

## Audited baseline

The linked production project has migration 011 behavior active. Before applying this repair, `supabase migration list --linked` must show local and remote versions 001–011 to be aligned, with only `012_zepbound_replace_daily_symptoms.sql` pending.

The following production differences are accepted as the canonical application schema and are encoded by `009_reconcile_legacy_schema.sql`:

- `saved_meals.serving_size` is `TEXT`, because serving sizes may be human-entered labels.
- `food_logs.meal_time` is `TIME`, with the detailed eating-window comment retained.
- `supplement_logs.user_supplement_id` is nullable and references `user_supplements(id) ON DELETE SET NULL`, preserving historical intake rows when a supplement definition is removed.
- Compatible additions already present in production, including soft-delete fields and later additive migrations, are not removed.

The audit also found two overbroad `food-photos` storage policies. Migration 009 drops exactly `Authenticated upload food-photos` and `Public read food-photos`, then retains/recreates authenticated upload, read, and delete policies restricted to the user's own top-level UUID folder. The existing `Service delete food-photos` policy is intentionally preserved. `storage.objects` is platform-managed and already has RLS enabled, so the migration changes policies without attempting to alter that table. The application creates signed URLs, and the analysis Edge Function continues to use its service-role storage client.

## Apply migration 012

Do not run this casually or as part of the web deployment. Use an operator with linked-project database authority, keep an audit transcript, and stop on any unexpected output.

1. Take a managed database backup and capture the current schema, policy catalog, and remote migration list.
2. Run `supabase migration list --linked`. Require local and remote versions 001–011 to be aligned and only `012_zepbound_replace_daily_symptoms.sql` to be pending. If the ledger or schema differs from this audited state, stop for review.
3. Run `supabase db push --linked --dry-run`. Review that only migration 012 will run and stop if any other migration or unexpected destructive statement appears. Migration 012 deletes only older rows that have the exact same `(user_id, log_date, symptom_type)`, retaining the row with the newest `created_at` (and greatest UUID as a deterministic timestamp tie-breaker). Distinct symptom types remain intact.
4. Schedule a brief maintenance window if needed. Before cleanup, migration 012 takes a `SHARE ROW EXCLUSIVE` table lock on `zepbound_symptom_logs`. PostgreSQL holds that lock through unique-index creation until the migration transaction commits. It blocks concurrent `INSERT`, `UPDATE`, and `DELETE` statements (and waits for existing writers), while it allows ordinary reads. Expect a brief write pause on the symptom table while deduplication, index creation, and the remainder of the transaction complete.
5. Apply migration 012 once with `supabase db push --linked`.
6. Verify that the remote ledger contains 001–012, both Zepbound tables retain RLS and owner-only policies, the unique owner/date/type index exists, and the authenticated-only RPC and None-exclusivity trigger exist. Confirm the RPC is unavailable to anonymous callers and do not add fake production health data. A reviewed read-only duplicate query may be used for verification.

These commands were validated against Supabase CLI 2.100.1. Re-check `db push --help` if the operator uses a different version. Do not use `migration repair` for migration 012; apply it normally so its cleanup, index, and function replacement execute.

## Rollback and recovery

- Never mark migration 012 reverted as a substitute for a schema rollback. If the applied migration causes an issue, stop writes if necessary and use a reviewed forward-fix/down migration or restore the managed backup.
- Preserve all real health, food, supplement, and storage data. Do not drop live tables or buckets to make migration history match.

Web deployment remains governed by `docs/DEPLOYMENT.md`. Database reconciliation is a separate, explicitly reviewed operator action and must be complete before deploying UI that depends on Zepbound tables.
