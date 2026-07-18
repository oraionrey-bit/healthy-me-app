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

Migration 014 adds the authenticated `SECURITY INVOKER` RPC `save_zepbound_daily_log` plus a coordination trigger; applying the migration does not mutate existing rows. The UI calls that RPC exactly once and performs no direct symptom/check-in writes.

The RPC validates authentication, date, complete symptom JSON, None exclusivity, duplicate types, severity/notes shape, workout consistency/range, and the nonblank overall answer before any mutation. It then takes the authenticated owner/date advisory transaction lock shared by existing symptom writes and direct legacy check-in writes, and in one PostgreSQL transaction:

1. deletes only symptom types absent from the submitted complete set;
2. updates matching types in place only for severity and notes, preserving `id`, `created_at`, `symptom_time`, and `injection_id`;
3. inserts only new types, assigning the latest eligible injection and noon placeholder only to those rows;
4. upserts the owner's check-in when either manual answer is nonnull, or deletes it when both are null.

Absent rows are deleted before updates/inserts so transitions to and from `None` remain compatible with the exclusivity trigger. Any delete, update, insert, or upsert failure rolls the complete operation back. `SECURITY INVOKER` and existing RLS preserve owner isolation. Old RPC/table APIs remain available for deployment compatibility.

The RPC takes its blocking owner/date advisory lock before touching rows. The `BEFORE INSERT OR UPDATE OR DELETE` trigger protecting direct legacy check-in writes uses only `pg_try_advisory_xact_lock`, because an UPDATE or DELETE statement may already hold a tuple lock when its row trigger runs. If the owner/date key is busy, the trigger immediately raises retryable PostgreSQL `serialization_failure` (`40001`); the legacy transaction aborts and releases its tuple lock instead of waiting and deadlocking with the RPC. A cached legacy write therefore cannot silently interleave with a complete save or leave mixed symptom/check-in state. Key-moving updates try old/new advisory keys in deterministic numeric order and abort if either is unavailable. Inserts, deletes, and same-key updates try one key. Trigger calls made by the lock-owning RPC are reentrant and succeed.

After a committed RPC, the client updates the selected day optimistically. A failed history refetch is shown as a non-destructive refresh warning, not as a database-save failure. Completion is scoped to the date that initiated the save so it cannot close or set an error on a newly selected date.

## Verification

Migration contract tests cover explicit transaction boundaries, no migration-time data DML, complete validation before mutation, shared lock, fail-fast `40001` legacy-write rejection with no blocking trigger lock, deterministic key-moving locks, replacement/upsert/delete behavior, injection association, invoker security, and grants. Hook/UI tests cover one complete RPC call, one action/save, hydration and field preservation, empty symptoms, unanswered check-in, None, custom symptoms, clear-answer behavior, failed-draft retention, date switching, shot separation, and read-only Health history.
