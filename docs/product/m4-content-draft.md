## M4 Content Draft

This document captures the strengthened prototype content structure for `M4` auditory pattern recognition.

This content is still `provisional_prototype_content`. It is not normed, validated, or diagnostic.

This phase also marks `M4` as `reduced_prototype_scope`. The current prototype uses shorter pattern lengths than the full research design so the runtime stays manageable for mobile manual testing.

## Prototype subtype structure

`M4` now supports two explicit prototype subtypes:

- `length_pattern`
  - uses `짧음` and `길음`
- `pitch_pattern`
  - uses `높음` and `낮음`

Both subtypes use manifest-backed items and safe synthesized fallback playback when local assets are not present.

## Practice structure

- Practice round 1:
  - subtype `length_pattern`
  - 2-item pattern `짧음-길음`
- Practice round 2:
  - subtype `pitch_pattern`
  - 2-item pattern `높음-낮음`

Practice remains unscored and only confirms that the child understands the task format.

## Age-based maximum pattern length

- Age 5:
  - maximum prototype pattern length `3`
- Age 6:
  - maximum prototype pattern length `4`

This limit is now validated in internal debug checks. It is intentionally shorter than the full research design, which is why the manifest and admin/debug views now surface `reduced_prototype_scope`.

## Prototype test examples

Age 5:

- `length_pattern`: `짧음-짧음-길음`
- `pitch_pattern`: `높음-낮음-높음`
- `length_pattern`: `길음-짧음-길음`

Age 6 additional:

- `pitch_pattern`: `낮음-높음-높음-낮음`
- `length_pattern`: `길음-짧음-짧음-길음`

## Runtime and asset notes

- If final local audio assets are missing, runtime falls back to safe synthesized playback
- Length patterns use duration contrast in fallback playback
- Pitch patterns use frequency contrast in fallback playback
- Admin/debug now surfaces subtype coverage, delivered item count, fallback usage, and malformed-pattern flags

## What still needs expert review

- Whether the pitch contrast is strong enough for consistent child perception on mobile devices
- Whether length and pitch items should be blocked or mixed in the final prototype
- Whether age 6 should include one more 4-step pitch-pattern item
- Whether final audio assets should standardize inter-tone spacing and loudness

## Explicit limitations

- This is prototype-grade content only
- This is a reduced-scope version of the intended research task
- It should not be treated as validated screening content
- No percentile norms or diagnostic interpretations are attached
