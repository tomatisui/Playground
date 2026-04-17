## M2 Content Draft

This document captures the first real prototype content pack for `M2` speech-in-noise.

This content is still `provisional_prototype_content`. It is not normed, validated, or diagnostic.

## Prototype 10-word pool

The current familiarization pool uses these child-friendly 2-syllable Korean nouns:

- `나무`
- `나비`
- `모자`
- `토끼`
- `바지`
- `가방`
- `사자`
- `기차`
- `바다`
- `우산`

Why these words were chosen:

- They are concrete and easy to picture
- They are familiar to many preschool children
- They are mostly easy to represent with simple icons or picture cards
- They avoid abstract vocabulary
- The shared 2-syllable shape keeps the prototype simple before real audio mixing is finalized

## Pre-learning rule

Current manifest-backed pre-learning metadata is:

- interaction: `tap_to_hear_word`
- follow-up recognition check: `four_choice_follow_up`
- active prototype training mastery threshold: `0.6`

Threshold policy is documented separately in [m2-threshold-policy.md](/Users/tomatis/Documents/Playground/docs/product/m2-threshold-policy.md).

The current runtime stays simple and reuses the stable practice flow. The future design can make the word-tap familiarization more explicit without changing the session engine.

## Test item structure

Each prototype test item includes:

- one target word
- four picture choices
- a difficulty label reflecting target-vs-noise clarity
- future-ready fields for:
  - background noise asset
  - target word asset
  - onset time
  - relative level

Current difficulty labels:

- `clear_plus`
- `moderate_masking`
- `stronger_masking`

## Current prototype item examples

Practice / pre-learning recognition:

- target `나무` with choices `나무, 모자, 토끼, 우산`
- target `기차` with choices `바지, 기차, 가방, 사자`

Age 5 core set:

- target `사자`
- target `모자`
- target `우산`

Age 6 additional set:

- target `가방`
- target `바다`

## What still needs expert review

- Whether the 10-word pool is equally familiar across classrooms and regions
- Whether some picture pairs are too visually similar for a first prototype
- Whether the current difficulty spacing is wide enough once real mixed audio is produced
- Whether classroom-style noise is the right first background-noise profile
- Whether target onset timing should be standardized across all final items

## Explicit limitations

- This is prototype-grade content only
- It should not be treated as validated screening content
- No percentile norms or diagnostic interpretations are attached
