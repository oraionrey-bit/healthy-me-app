# Zepbound tracking — product and implementation spec

## Product audit

The authenticated production app was reviewed read-only on a mobile viewport before this redesign.

- Home is the daily action surface. Its selected-date workflow already owns water, supplements, calf recovery, food context, and the expandable daily check-in.
- Health is a trends and archive surface. It leads with 7/30/90-day trends, period history, supplements, labs, and weight.
- The first Zepbound release broke that pattern: Home showed status only and told the user to leave Home to enter a shot or symptom in Health.
- The daily check-in already records broad daily symptoms. Zepbound symptoms still need their own event time and shot association, so they should be entered beside the daily workflow without being merged into the check-in's one-entry-per-day symptom model.

## Product decision

Make Home the only routine Zepbound entry point and inherit the date from Home's date navigator.

- **Home:** show selected-day Zepbound status plus two lightweight actions: **Log shot** and **Log symptom**.
- **Shot flow:** require only the user's stated essentials—dose and time. Keep injection site and notes as optional details so the common path stays short and existing data remains compatible.
- **Symptom flow:** capture symptom, severity, and time, with optional notes. Associate it with the most recent shot at or before that timestamp.
- **Health:** show next-shot context and the complete shot/symptom history. Do not duplicate entry forms there.

This keeps all daily actions in the user's established Home workflow while preserving Health as the place to review the longitudinal medication story.

## Requirements and traceability

| ID | Requirement | Implementation | Verification |
|---|---|---|---|
| ZEP-1 | Home is the primary and only routine entry surface for Zepbound. | `DailyZepboundLogCard` on Home; Health has no log controls | Home/component tests + live/local smoke |
| ZEP-2 | Record a weekly shot with selected Home date, time, and dose. | Home shot form + `useZepbound.saveInjection` | Component payload/validation tests |
| ZEP-3 | Keep the common shot flow short; site and notes are optional details. | Collapsed optional-details control; `other` site fallback preserves the existing schema | Component tests + data compatibility review |
| ZEP-4 | Record a symptom with selected Home date, time, type, severity, and optional notes. | Home symptom form + `useZepbound.saveSymptom` | Component payload/validation tests |
| ZEP-5 | Associate symptoms with the latest shot at or before the symptom timestamp. | Timestamp-aware association in `useZepbound` | Hook-through-component tests |
| ZEP-6 | Show status for the selected Home date and useful next-shot context without navigating away. | `DailyZepboundLogCard` summary | Selected-date component tests |
| ZEP-7 | Keep complete longitudinal history and next-shot context in Health without duplicate entry UI. | Read-only `ZepboundTrackerCard` | Health/component tests |
| ZEP-8 | Reject malformed dates/times, invalid doses, and invalid symptom severity before writing. | `zepbound-validation`, inline errors, database checks | Validation/component/migration tests |
| ZEP-9 | Preserve existing rows, ownership, privacy, and production compatibility. | Existing tables/types/RLS unchanged; no new migration | Typecheck + migration/data review |
| ZEP-10 | Match the existing compact Home card, typography, spacing, accessibility, and selected-date behavior. | Existing theme/shared controls; accessible expanded/selected states | Component tests + build/smoke |

## Interaction details

### Home summary

- Show shots and Zepbound symptoms for the selected date.
- When empty, show the most recent shot and estimated next weekly date when available.
- Opening one entry form closes the other to keep the mobile card compact.
- A save closes its form and refreshes the summary/history.
- Date is displayed as context but is not typed manually; changing Home's date navigator changes the entry date.

### Shot entry

- Dose options: 2.5, 5, 7.5, 10, 12.5, and 15 mg.
- Time is required in local `HH:MM` form.
- Optional details expose injection site and notes.

### Symptom entry

- Preset symptom types cover common Zepbound experiences plus Other.
- Severity is required on a 1–5 scale.
- Time is required in local `HH:MM` form.
- Notes are optional.

### Health history

- Group associated symptoms beneath their shot.
- Keep unassociated symptoms visible.
- Retain delete controls for correcting records; deletion is record maintenance, not routine logging.

## Data model and compatibility

- Keep `zepbound_injections` and `zepbound_symptom_logs` unchanged.
- Dates and times remain separate local-calendar values, avoiding timezone day shifts.
- Existing injection-site values and notes remain visible in history.
- New quick shot entries use the existing `other` enum value when optional site is not chosen.
- No migration is required for this redesign.

## Out of scope

- Dose recommendations or medical guidance.
- Reminders/notifications, pharmacy inventory, automatic schedule changes, symptom causality claims, or analytics based on insufficient history.
