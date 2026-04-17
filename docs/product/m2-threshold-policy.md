## M2 Threshold Policy

This note records the current prototype threshold choice for `M2` pre-learning and why two threshold values remain documented internally.

## Active policy

- `prototype_default_threshold = 0.6`
- `proposal_alt_threshold = 0.7`
- active runtime threshold: `0.6`

## Why both are documented

The proposal text appears internally inconsistent because it points to a stricter `0.7` interpretation in one place while the surrounding prototype logic reads more naturally as a slightly more permissive early-testing rule.

For the current prototype we keep `0.6` active because:

- it aligns better with the stable generic practice flow already used across modules
- it avoids making early manual testing too brittle
- it still requires more than chance performance on a 4-choice recognition check

We still document `0.7` because:

- it appears in the proposal trail
- it may become the preferred stricter policy once final assets and fuller training behavior are in place
- product and research review should be able to see both values clearly

## Current implementation note

The active threshold remains config-driven in the `M2` manifest, so later product review can change the threshold without refactoring the guardian/session flow.
