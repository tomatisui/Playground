## Placeholder Policy

M1 and M2 are intentionally formalized placeholders in Phase 3A.

## Goals

- Keep placeholder modules visible in the age-specific structure
- Keep guardian and admin flows stable
- Avoid making placeholders look like broken or missing modules
- Preserve clear internal signals that content is not final

## Required labels

Placeholder modules should carry:

- `prototype_placeholder`
- `content_not_final`

## Runtime handling

- Placeholder modules must render as intentional prototype screens.
- Placeholder modules must allow the session flow to continue without fake scored content.
- Placeholder modules must be distinguishable from missing or corrupt content.
- Admin should show when placeholder modules were used.

## Report handling

- Parent-facing reports stay non-diagnostic.
- If placeholder modules were part of a run, the run may be marked internally as `prototype_grade`.
- Parent-facing wording should frame the result as a prototype observation summary, not as a failure or warning.

## Non-goals

- Placeholder modules are not a substitute for finalized stimuli.
- Placeholder runs do not qualify as content-final screening data.
- Placeholder policy does not introduce percentile or diagnostic interpretation.
