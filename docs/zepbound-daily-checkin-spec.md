# Zepbound manual daily check-in

## Scope

Home's selected-date Zepbound card is the only editing surface for a small manual check-in that is independent of Oura. Health remains longitudinal, read-only history.

## Acceptance criteria

- `Worked out today?` is an explicit nullable Yes/No answer.
- Yes requires whole minutes from 1 through 1440. Quick choices are 20, 30, 45, and 60; the minutes field remains editable.
- No clears duration. An unanswered workout also has no duration.
- A saved duration of at least 20 minutes says the daily goal was met. A smaller duration states the remaining minutes neutrally.
- `Pooped today?` is an explicit nullable Yes/No answer in the same check-in.
- At least one of workout or pooped must be answered before saving.
- One row exists per authenticated owner and date. Saving is one atomic upsert and saved values hydrate on reopen/date changes.
- Home shows a compact saved summary. Health history includes date, workout, and pooped values without adding another editor.
- No workout type, intensity, calories, time, or Oura synchronization is added.

## Data contract

Migration 013 adds `zepbound_daily_checkins`: UUID id, owner `user_id`, `log_date`, nullable `worked_out`, nullable `workout_duration_minutes`, nullable `pooped`, and timestamps. A unique `(user_id, log_date)` constraint and owner-only RLS enforce one private row per day. Checks enforce at least one answer and duration consistency/range.

## Verification

Migration contract tests inspect schema, checks, uniqueness, RLS, and owner policies. Hook/UI tests cover fetch and upsert behavior, errors and retained drafts, empty/No/Yes states, arbitrary and quick durations, goal language, pooped values, hydration/date switching, history, and forbidden fields. Full typecheck, Jest, Pages export, and Playwright smoke must pass before merge.
