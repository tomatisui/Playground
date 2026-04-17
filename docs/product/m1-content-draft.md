## M1 Content Draft

This document captures the first staircase-ready acoustic prototype for `M1` phonemic discrimination.

This content is still `provisional_prototype_content`. It is not normed, validated, or diagnostic.

## Current contrast design

The current prototype keeps one explicit target contrast:

- `/바/`
- `/다/`

The present manifest preserves the staircase idea through item metadata rather than a full adaptive engine.

## Staircase-ready prototype structure

Each item includes:

- a target syllable prompt
- two response choices: `바` and `다`
- `staircaseLevel`
- `consonantDurationMs`
- `relativeLevelDb`

These fields are meant to keep the acoustic prototype compatible with later expansion toward the intended 10-level design.

## Practice structure

- easiest `/바/` anchor
- easiest `/다/` anchor

Both use the strongest prototype acoustic settings so the child can learn the response format before scored items.

## Prototype test structure

Age 5 core prototype levels:

- level 8: target `바`
- level 7: target `다`
- level 6: target `바`

Age 6 additional prototype levels:

- level 5: target `다`
- level 4: target `바`

## What still requires real audio production later

- recorded `/바/` and `/다/` syllables across the intended acoustic staircase
- controlled consonant duration editing
- calibrated relative emphasis / level differences
- finalized local asset set for each staircase step
- review of whether fallback TTS should be replaced entirely once acoustic assets are ready

## Explicit limitations

- This is prototype-grade content only
- The acoustic content is still marked `acoustic_content_not_final`
- Safe fallback currently uses spoken syllable prompts instead of final produced acoustic tokens
- It should not be treated as validated screening content
- No percentile norms or diagnostic interpretations are attached
