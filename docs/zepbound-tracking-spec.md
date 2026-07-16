# Zepbound tracking — implementation spec

## Product decision

Use a dedicated Zepbound area in Health for the longitudinal weekly record. Surface a read-only status for the selected day on Home so the daily tracker provides context without creating a second place to enter the same data.

## Requirements and traceability

| ID | Requirement | Implementation | Verification |
|---|---|---|---|
| ZEP-1 | Record each weekly shot's date, time, dose, injection site, and optional notes. | `zepbound_injections`, `useZepbound`, `ZepboundTrackerCard` | Component tests + typecheck |
| ZEP-2 | Record dated/timed symptoms with severity and notes, associated with the most recent shot when available. | `zepbound_symptom_logs`, `useZepbound`, symptom form/history | Component tests + typecheck |
| ZEP-3 | Keep a longitudinal history in a dedicated Health section. | `ZepboundTrackerCard` in `HealthDashboard` | Health/component tests |
| ZEP-4 | Surface shot/symptom status for the selected Home date without duplicate entry UI. | `DailyZepboundStatusCard` | Home/component tests |
| ZEP-5 | Keep each user's medication data private. | RLS policies on both new tables | Migration review |
| ZEP-6 | Match existing minimal card, typography, spacing, and control patterns. | Shared `HealthCard`, theme constants, compact collapsed forms | Snapshot/build verification |

## Data model

- `zepbound_injections`: one row per injection event.
- `zepbound_symptom_logs`: one row per symptom observation; `injection_id` is optional and defaults in the UI to the most recent injection on or before the symptom date.
- Dates and times are stored separately to preserve the user's local calendar day/time without timezone conversion surprises.

## Out of scope

- Dose recommendations, medical guidance, reminders/notifications, pharmacy inventory, and automatic schedule changes.
