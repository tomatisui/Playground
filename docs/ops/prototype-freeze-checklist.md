## Prototype Freeze Checklist

Phase `4A` freezes the current preschool listening-risk screening prototype into a stable internal test build.

Build label:

- `v0-internal-freeze-4A`

## Freeze goals

- Keep the guardian-to-child runtime stable
- Avoid new major features
- Make module readiness and asset readiness visible
- Support repeatable local manual testing
- Keep all parent-facing language non-diagnostic

## Freeze checklist

- [x] All expected modules exist in the prototype:
  - `M1`, `M2`, `M3`, `M3-R`, `M4`, `M5`
- [x] Admin shows internal build/version label
- [x] Admin shows module readiness summary
- [x] Admin shows asset readiness matrix
- [x] Admin includes internal-only reset and sample-session utilities
- [x] Admin session view shows end-to-end module detail
- [x] Report keeps:
  - what was observed
  - why interpretation is limited
  - what to do next
- [x] Report gently frames prototype/fallback/reduced-scope runs
- [x] Manual test matrix is documented
- [x] Module readiness matrix is documented

## Known prototype constraints

- Most modules still rely on fallback audio because final local audio assets are not present yet
- `M4` is explicitly `reduced_prototype_scope`
- `M1` is explicitly `acoustic_content_not_final`
- Percentile norms are not implemented
- No diagnosis language is used
- No microphone recording is implemented
- No cloud deployment work is included

## Verification commands

- `npm run lint`
- `npm run build`
