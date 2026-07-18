# Unified Zepbound daily check-in

## Scope

Home's selected-date Zepbound card has one compact **Daily Zepbound check-in** editor for symptoms, workout, and pooped. Shot logging remains separate. Health remains longitudinal, read-only history, and the feature is independent of Oura.

## Full-state UX contract

- Opening the editor hydrates symptoms and the manual check-in row for the selected date together.
- Closing and reopening discards an unsaved draft and rehydrates persisted state; changing dates hydrates the new date without leaking the old draft.
- Symptoms remain a multi-select with exclusive `None`, shared severity and notes, and selected-date legacy/custom symptom options. `Indigestion` and `Fullness` are separate standard GI options, can be selected together, and appear in deterministic order after `Reflux`.
- Selection-only edits preserve the exact severity and notes of every untouched persisted symptom; newly selected symptoms use the shared controls. This prevents heterogeneous legacy rows from being flattened accidentally.
- An empty symptom array means the symptom question is unanswered; it is valid when workout or pooped is answered.
- `Worked out today?` and `Pooped today?` are nullable Yes/No answers. Clear answer returns either to null.
- Workout Yes requires an integer from 1 through 1440. Quick choices are 20, 30, 45, and 60, while arbitrary minutes remain editable. Goal status uses 20 minutes.
- At least one answer overall is required, preventing an accidental blank save from clearing the date.
- The one **Save daily check-in** button submits the complete state. A failed save leaves the complete draft visible.

## Atomic data contract

Migration 014 adds only the authenticated `SECURITY INVOKER` RPC `save_zepbound_daily_log`; applying the migration does not mutate existing rows. The UI calls that RPC exactly once and performs no direct symptom/check-in writes.

The RPC validates authentication, date, complete symptom JSON, None exclusivity, duplicate types, severity/notes shape, workout consistency/range, and the nonblank overall answer before any mutation. It then takes the same authenticated owner/date advisory transaction lock used by existing symptom writes, preserves nearest-prior injection association, and in one PostgreSQL transaction:

1. fully replaces that owner's symptom rows for the date;
2. upserts the owner's check-in when either manual answer is nonnull, or deletes it when both are null.

Any delete, insert, or upsert failure rolls the complete operation back. `SECURITY INVOKER` and existing RLS preserve owner isolation. Old RPC/table APIs remain available for deployment compatibility.

## Verification

Migration contract tests cover explicit transaction boundaries, no migration-time data DML, complete validation before mutation, shared lock, replacement/upsert/delete behavior, injection association, invoker security, and grants. Hook/UI tests cover one complete RPC call, one action/save, hydration and field preservation, empty symptoms, unanswered check-in, None, custom symptoms, clear-answer behavior, failed-draft retention, date switching, shot separation, and read-only Health history.
