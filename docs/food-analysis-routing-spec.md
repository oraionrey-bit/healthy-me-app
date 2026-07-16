# Food analysis result routing

## Problem

Logging a meal in Healthy Me stores the meal in the app and starts the
`analyze-food` Edge Function. After a successful analysis, that function also
sends the result to Tina through a legacy Telegram bot conversation. That
duplicates the result already shown in Healthy Me and sends normal app activity
to a dead channel.

## Requirements

1. A food log and its AI analysis remain in Healthy Me (`food_logs`) and are
   displayed by the Food and Home views.
2. A successful food analysis must not send a Telegram message to Tina or any
   other user-facing Telegram conversation.
3. Food analysis must not depend on Telegram. Failures remain visible through
   the Edge Function response and platform logs; the successful path sends no
   user-facing or operator Telegram message.
4. Meal creation, photo analysis, leftovers analysis, nutrition updates, and
   in-app polling must keep their current behavior.
5. No database migration or data rewrite is required.
6. Each completed AI analysis must show a small, friendly provider label beside
   that food log, derived from the provider metadata stored on that specific
   record. ClawRouter and Anthropic map to `Analyzed by Claude`; Gemini maps to
   `Analyzed by Gemini`.
7. Pending, manually entered, un-analyzed, or unknown-provider records must not
   show an analyzer label.
8. Leftovers re-analysis must preserve both its adjustment indicator and its
   analyzer label.
9. Tina's analysis must call Gemini 2.5 Flash directly. ClawRouter and
   Anthropic must not be attempted first, so a working analysis does not incur
   avoidable latency or depend on failing Claude credentials/routes.
10. Tina must continue using the dedicated PCOS prompt, including her portion,
    cultural-food, daily-target, and PCOS-specific guidance. Provider routing
    and prompt selection are independent decisions.
11. Existing analyzed records retain their stored metadata. Historical Claude
    results continue to display `Analyzed by Claude`; new Tina results store
    `gemini` and display `Analyzed by Gemini`.

## Acceptance criteria

- The Home/Food path still reads the persisted and analyzed `food_logs` record.
- The successful-analysis path updates the record and returns it without calling
  a user-facing Telegram notification helper.
- A regression test fails if the Edge Function reintroduces a Telegram food-log
  path, Claude credentials/endpoints, or a non-Gemini provider for Tina.
- Provider-label parsing handles `clawrouter`, `anthropic`, `gemini`, leftovers
  metadata, pending records, missing metadata, and unknown metadata.
- The Food log renders `Analyzed by Claude` or `Analyzed by Gemini` only after a
  completed analysis with recognized per-record metadata.
- The routing test verifies Tina receives `PCOS_PROMPT` and exactly one live
  provider: Gemini 2.5 Flash.
- Relevant tests, strict TypeScript, and the production web export pass.
