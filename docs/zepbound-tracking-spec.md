# Zepbound tracking — product and implementation spec

## Product audit

The authenticated production app was reviewed read-only on a mobile viewport before this redesign.

- Home is the daily action surface. Its selected-date workflow already owns water, supplements, calf recovery, food context, and the expandable daily check-in.
- Health is a trends and archive surface. It leads with 7/30/90-day trends, period history, supplements, labs, and weight.
- The first Zepbound release broke that pattern: Home showed status only and told the user to leave Home to enter a shot or symptom in Health.
- The daily check-in already records broad daily symptoms. Zepbound symptoms remain separate so multiple medication-related symptoms—or an explicit no-symptoms entry—can be recorded for a day.

## Product decision

Make Home the only routine Zepbound entry point and inherit the date from Home's date navigator.

- **Home:** show selected-day Zepbound status plus two lightweight actions: **Log shot** and **Log symptom**.
- **Shot flow:** require only the user's stated essentials—dose and time. Keep injection site and notes as optional details so the common path stays short and existing data remains compatible.
- **Symptom flow:** capture one or more symptoms, or None, with shared severity and optional notes. Do not ask for a time. Associate entries with the most recent shot on or before the selected date.
- **Health:** show next-shot context and the complete shot/symptom history. Do not duplicate entry forms there.

This keeps all daily actions in the user's established Home workflow while preserving Health as the place to review the longitudinal medication story.

## Requirements and traceability

| ID | Requirement | Implementation | Verification |
|---|---|---|---|
| ZEP-1 | Home is the primary and only routine entry surface for Zepbound. | `DailyZepboundLogCard` on Home; Health has no log controls | Home/component tests + live/local smoke |
| ZEP-2 | Record a weekly shot with selected Home date, time, and dose. | Home shot form + `useZepbound.saveInjection` | Component payload/validation tests |
| ZEP-3 | Keep the common shot flow short; site and notes are optional details. | Collapsed optional-details control; `other` site fallback preserves the existing schema | Component tests + data compatibility review |
| ZEP-4 | Record multiple symptoms, or an explicit None, with selected Home date, shared severity, and optional notes; symptom time is not requested. Save the selected batch atomically as the complete replacement set for that date. | Home symptom form + `useZepbound.saveSymptoms` + transactional database RPC | Component payload/failure tests + migration review |
| ZEP-5 | Associate symptoms with the latest shot on or before the symptom date. | Deterministic date/time ordering in the transactional database RPC | Component + migration tests, independent of fetched fixture order |
| ZEP-6 | Show status for the selected Home date and useful next-shot context without navigating away. | `DailyZepboundLogCard` summary | Selected-date component tests |
| ZEP-7 | Keep complete longitudinal history and next-shot context in Health without duplicate entry UI. | Read-only `ZepboundTrackerCard` | Health/component tests |
| ZEP-8 | Reject malformed dates/times, invalid doses, and invalid symptom severity before writing. | `zepbound-validation`, inline errors, database checks | Validation/component/migration tests |
| ZEP-9 | Preserve valid existing rows, ownership, privacy, and production compatibility. | Forward migration retains the tables/RLS, reconciles only contradictory None sentinels, and exposes an authenticated security-invoker RPC | Typecheck + migration/data review |
| ZEP-10 | Match the existing compact Home card, typography, spacing, accessibility, and selected-date behavior. | Existing theme/shared controls; accessible expanded/selected states | Component tests + build/smoke |
| ZEP-11 | Never require the user to type or interpret 24-hour time. Shot entry uses 12-hour hour/minute fields and an explicit AM/PM choice; symptom entry has no time control. | Shared `ZepboundTimeInput` for shots only | Component and conversion tests covering 12 AM/PM and invalid combinations |
| ZEP-12 | Render shot times in 12-hour AM/PM form on Home and Health; do not display the schema-only symptom placeholder time. | Shared time formatter for shots only | Home/Health component tests with existing database `TIME` values |
| ZEP-13 | Treat entered shot times as Pacific local civil time (`America/Los_Angeles`), including daylight-saving changes, without applying a fixed UTC offset or shifting the selected date. | Pacific-aware default-time helper; time-only database boundary converter | DST/default-time and round-trip tests |
| ZEP-14 | Preserve database `DATE` + `TIME` values exactly at the storage boundary. Existing rows remain compatible and no timezone conversion is applied to stored local civil times. | `zepbound-time` utilities + existing `useZepbound` payloads | Round-trip, seconds, and existing-value tests |
| ZEP-15 | Zepbound records remain private, owner-scoped, constrained, and safely related. | Existing checks/FKs/RLS plus documented schema audit | Migration policy/constraint tests and production metadata review |

## Interaction details

### Home summary

- Show shots and Zepbound symptoms for the selected date.
- When empty, show the most recent shot and estimated next weekly date when available.
- Opening one entry form closes the other to keep the mobile card compact.
- A save closes its form and refreshes the summary/history.
- Date is displayed as context but is not typed manually; changing Home's date navigator changes the entry date.

### Shot entry

- Dose options: 2.5, 5, 7.5, 10, 12.5, and 15 mg.
- Time is required through labeled Hour, Minute, and AM/PM controls. The default is the current Pacific local time.
- Hour accepts 1–12 and minute accepts 00–59. Incomplete or invalid combinations show a specific inline error before any write.
- Optional details expose injection site and notes.

### Symptom entry

- Preset symptom types cover common Zepbound experiences plus Other and can be selected together.
- None is an exclusive option and records that there were no symptoms that day. Saving None removes real symptom entries for that user/date; saving real symptoms removes a prior None entry for that user/date.
- Severity is required on a shared 1–5 scale when symptoms are selected; None uses the schema-compatible minimum severity and does not show the control.
- No symptom time is requested or displayed. A stable noon placeholder is written only to remain compatible with the existing non-null database column.
- Notes are optional.

### Health history

- Group associated symptoms beneath their shot.
- Keep unassociated symptoms visible.
- Retain delete controls for correcting records; deletion is record maintenance, not routine logging.

## Data model and compatibility

- Keep the existing `zepbound_injections` and `zepbound_symptom_logs` columns and historical real-symptom rows. Migration 011 adds the RPC and exclusivity trigger. Forward migration 012 repairs its append behavior, deduplicates only exact owner/date/type collisions by retaining the newest row, adds an owner/date/type unique index, and makes each RPC save replace that owner's complete set for the selected date.
- Dates and shot times remain separate Pacific local-calendar values, avoiding timezone day shifts. `TIME` has no timezone, so a shot stored as `09:30:00` is displayed as `9:30 AM` rather than converted as an instant. Symptom placeholder times are not displayed.
- The database boundary converts 12-hour entry to canonical `HH:MM`; reading accepts canonical PostgreSQL `HH:MM:SS[.fraction]` without changing its local meaning.
- Existing injection-site values and notes remain visible in history.
- New quick shot entries use the existing `other` enum value when optional site is not chosen.
- Migration 011 is required before releasing the batch-save UI.

## Data-integrity and security acceptance criteria

- Injection date/time/dose/site and symptom date/time/type/severity are `NOT NULL` and value constrained where appropriate.
- Both tables have RLS enabled and owner-scoped select/insert/update/delete policies.
- Symptom-to-shot links reject cross-owner references for normal authenticated writes; deleting a shot preserves symptom history by setting only the optional relationship to null.
- User deletion cascades to both Zepbound tables.
- Multiple distinct symptoms in one selected-date save remain valid and commit together or not at all. A symptom type is unique per owner/date, while distinct types remain intact. Exact duplicate shots are not silently discarded because corrections and historical imports must stay lossless; the UI does not retry writes automatically.
- Schema changes, if ever required, must be forward-only and validated against the production migration ledger before application.

## Out of scope

- Dose recommendations or medical guidance.
- Reminders/notifications, pharmacy inventory, automatic schedule changes, symptom causality claims, or analytics based on insufficient history.
