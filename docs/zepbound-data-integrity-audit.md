# Zepbound data-integrity and security audit

Audit date: 2026-07-16

Scope: migration `010_zepbound_tracking.sql`, generated TypeScript database types, `useZepbound` reads/writes/deletes, symptom association, and the linked production migration ledger. No health-row contents were inspected.

## Result

The current schema is appropriate for the requested shot and symptom history. No forward migration is needed for the 12-hour UI: PostgreSQL `DATE` plus `TIME` already stores Pacific local civil values without a timezone shift, and all existing `TIME` rows remain compatible.

The linked migration ledger was verified aligned through local/remote version `010` before this release.

## Control review

| Area | Evidence | Finding |
|---|---|---|
| Shot essentials | `injection_date`, `injection_time`, `dose_mg`, and `injection_site` are `NOT NULL`; dose is positive and site is enum-constrained | Pass |
| Symptom essentials | `log_date`, `symptom_time`, `symptom_type`, and `severity` are `NOT NULL`; nonblank symptom and severity 1–5 are checked | Pass |
| User lifecycle | Both `user_id` foreign keys reference `user_profiles(id) ON DELETE CASCADE` | Pass |
| Shot relationship | `injection_id` references a real shot and uses `ON DELETE SET NULL`, preserving symptom history after shot correction/deletion | Pass |
| Ownership | RLS is enabled on both tables; select/insert/update/delete policies scope records to `auth.uid()` | Pass |
| Cross-owner links | Symptom insert/update `WITH CHECK` permits a relationship only when the referenced shot belongs to `auth.uid()` | Pass for authenticated application access; service-role access intentionally bypasses RLS and remains trusted server infrastructure |
| Runtime reads | Queries explicitly filter `user_id` and sort by local date then local time | Pass (defense in depth alongside RLS) |
| Runtime writes/deletes | Inserts derive `user_id` from the authenticated session; deletes match both record id and user id | Pass |
| Association | A symptom links to the newest fetched shot whose local date/time is at or before the symptom local date/time | Pass; covered across same-day earlier/later shots and pre-first-shot symptoms |
| Null semantics | Notes and relationship are nullable; required medical event fields are not | Pass |
| Duplicates | No uniqueness constraint discards repeated symptoms or historical corrections. The UI performs one insert per explicit save and does not automatically retry writes | Accepted, lossless behavior |
| Existing data | Reader accepts PostgreSQL `HH:MM:SS` and fractional-second values and renders them without timezone conversion | Pass |
| Migration safety | Migration 010 is already applied and was not edited; this change is application-only | Pass |

## Deliberate choices

- Dose is constrained positive rather than to today's six UI presets. That preserves legitimate historical/imported values and avoids requiring a database migration if prescribed strengths change. The app's routine entry surface still limits selection to supported preset doses.
- Exact duplicate-shot prevention is not imposed at the database layer because it could make historical reconciliation lossy. A future duplicate-warning UX can be added without rejecting data.
- Pacific daylight-saving behavior is used only to choose the current entry default. Stored times are civil clock values, not instants, so reading `9:30 AM` never applies UTC-7/UTC-8 conversion or shifts its date.
