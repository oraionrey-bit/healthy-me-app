# Supabase migration reconciliation

This runbook records the reviewed, one-time reconciliation required before releasing Zepbound tracking. It documents a local plan only; the audit and implementation work did not change production.

## Audited baseline

The linked production project was inspected read-only on 2026-07-15. Its remote migration ledger was empty even though the material schema from migrations 001–008 was already present.

The following production differences are accepted as the canonical application schema and are encoded by `009_reconcile_legacy_schema.sql`:

- `saved_meals.serving_size` is `TEXT`, because serving sizes may be human-entered labels.
- `food_logs.meal_time` is `TIME`, with the detailed eating-window comment retained.
- `supplement_logs.user_supplement_id` is nullable and references `user_supplements(id) ON DELETE SET NULL`, preserving historical intake rows when a supplement definition is removed.
- Compatible additions already present in production, including soft-delete fields and later additive migrations, are not removed.

The audit also found two overbroad `food-photos` storage policies. Migration 009 drops exactly `Authenticated upload food-photos` and `Public read food-photos`, then retains/recreates authenticated upload, read, and delete policies restricted to the user's own top-level UUID folder. The existing `Service delete food-photos` policy is intentionally preserved. The application creates signed URLs, and the analysis Edge Function continues to use its service-role storage client.

## One-time repair and apply procedure

Do not run this casually or as part of the web deployment. Use an operator with linked-project database authority, keep an audit transcript, and stop on any unexpected output.

1. Take a managed database backup and capture the current schema, policy catalog, and remote migration list.
2. Confirm the remote migration ledger is still empty and re-run the baseline checks proving migrations 001–008 are materially present. If the ledger or schema differs from the audited state, stop for review.
3. Mark only the existing baseline migrations as applied in migration history:

   ```bash
   for version in 001 002 003 004 005 006 007 008; do
     supabase migration repair "$version" --status applied --linked
   done
   ```

4. Run `supabase migration list --linked`. Require remote 001–008 to be applied and only `009_reconcile_legacy_schema.sql` and `010_zepbound_tracking.sql` to be pending.
5. Run `supabase db push --linked --dry-run`. Review the exact 009 then 010 order and stop if any other migration or destructive statement appears.
6. Apply the pending migrations once with `supabase db push --linked`. Migration tracking must apply 009 before 010 and prevent replay.
7. Verify that the remote ledger contains 001–010, the three canonical column/FK definitions match this document, both Zepbound tables have RLS and owner-only policies, and the two overbroad photo policies are absent. Confirm authenticated own-folder upload/read/delete and service-role analysis without adding fake production health data.

These commands were validated against Supabase CLI 2.100.1. Re-check `migration repair --help` and `db push --help` if the operator uses a different version. The loop intentionally repairs one version per invocation. Do not repair 009 or 010 as applied.

## Rollback and recovery

- Before `db push`, an incorrect history-only repair can be reversed by marking only 001–008 as reverted after review. This changes migration history, not the existing schema.
- Never mark 009 or 010 reverted as a substitute for a schema rollback. If either applied migration causes an issue, stop writes if necessary and use a reviewed forward-fix/down migration or restore the managed backup.
- Preserve all real health, food, supplement, and storage data. Do not drop live tables or buckets to make migration history match.

Web deployment remains governed by `docs/DEPLOYMENT.md`. Database reconciliation is a separate, explicitly reviewed operator action and must be complete before deploying UI that depends on Zepbound tables.
