## Module Manifest Spec

Phase 3A moves screening content into per-module JSON manifests so content can evolve without changing core runtime logic.

## Location

- `content/stimuli/M1.manifest.json`
- `content/stimuli/M2.manifest.json`
- `content/stimuli/M3.manifest.json`
- `content/stimuli/M3-R.manifest.json`
- `content/stimuli/M4.manifest.json`
- `content/stimuli/M5.manifest.json`

## Common schema

Top-level fields:

- `moduleCode`: stable module id such as `M3`
- `title`: human-readable module title
- `implemented`: boolean runtime readiness flag
- `ageBand`: supported ages, currently `5` and/or `6`
- `playbackType`: `tts` or `pattern`
- `instructions`: runtime instruction copy
- `trainingPool`: optional familiarization pool for prototype content packs
- `preLearning`: optional metadata for pre-learning and recognition-check behavior
- `practiceItems`: array of practice items
- `testItems`: array of scored items
- `promptAudio`: reserved list of top-level audio asset references
- `choiceImages`: reserved list of top-level image asset references
- `correctAnswer`: reserved summary field for schema parity
- `difficultyLevel`: manifest-level summary label
- `placeholder`: explicit placeholder status
- `labels`: internal metadata such as `prototype_placeholder` and `content_not_final`
- `notes`: internal authoring note

Item fields:

- `id`: stable item id
- `ageBand`: ages supported by the item
- `prompt`: fallback runtime text prompt
- `promptAudio`: relative asset path or `null`
- `localAudioPath`: optional local placeholder for future recorded assets
- `promptSequence`: optional tokenized spoken sequence for content review and future audio prep
- `choices`: choice labels
- `choiceImageKeys`: optional internal image keys
- `choiceImages`: relative asset paths for choice imagery
- `correctAnswer`: correct choice label
- `difficultyLevel`: authoring difficulty tag
- `placeholder`: whether the item is placeholder content
- `labels`: internal lifecycle and content metadata
- `reviewNeeded`: optional internal review flag for lexical exceptions or draft items
- `backgroundNoiseAsset`: optional future-ready background-noise asset reference
- `targetWordAsset`: optional future-ready target-word asset reference
- `onsetTimeMs`: optional future-ready target onset timing
- `relativeLevelDb`: optional future-ready target-versus-noise level hint
- `notes`: internal content note

## Runtime expectations

- Runtime pages should read manifests through `src/lib/module-catalog.ts`.
- Placeholder manifests are intentional prototype content, not missing content.
- If audio/image assets are absent, runtime may safely fall back to text-to-speech or pattern synthesis.
- Admin should expose whether content assets were `real_assets`, `fallback_assets`, or `prototype_placeholder`.

## Authoring guidance

- Keep ids stable once a manifest is used in manual testing.
- Prefer relative asset references under `content/audio` and `content/images`.
- Use `labels` for internal lifecycle/status metadata only.
- Do not put percentile or diagnostic language in manifests.
