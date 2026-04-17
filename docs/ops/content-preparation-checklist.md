## Content Preparation Checklist

Use this checklist before turning placeholder or fallback content into production-ready content assets.

## Folder structure

- Confirm `content/stimuli` contains one manifest per module
- Confirm `content/audio` exists for prompt audio assets
- Confirm `content/images` exists for image choice assets

## Manifest readiness

- `moduleCode` matches the intended route/runtime module
- `ageBand` is correct for the target ages
- `placeholder` is set correctly
- `labels` include `content_not_final` until assets are truly ready
- `notes` explain any temporary content constraints

## Stimulus readiness

- Each practice and test item has a stable `id`
- `correctAnswer` matches the intended correct choice
- `difficultyLevel` is filled consistently
- `promptAudio` is linked when recorded assets exist
- `choiceImages` is linked when visual choices are used

## Runtime safety

- Guardian-facing wording stays non-diagnostic
- No percentile or norm language appears in content
- Placeholder modules remain explicitly flagged
- Fallback assets are acceptable only when intentionally documented

## Admin review

- Expected modules render correctly for age 5 and age 6
- Placeholder usage is visible in admin
- Content asset status is visible in admin
- Provisional summaries still render when content is manifest-backed
