## Preschool Listening Screen Prototype

Mobile-first web prototype for a non-diagnostic preschool listening-risk screening platform built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Frozen age structure

Age 5:

- `M1` phonemic discrimination
- `M2` speech-in-noise
- `M3` auditory working memory forward
- `M4` auditory pattern recognition
- `M5` phonological awareness

Age 6:

- `M1` phonemic discrimination
- `M2` speech-in-noise
- `M3` auditory working memory forward
- `M3-R` auditory working memory backward
- `M4` auditory pattern recognition
- `M5` phonological awareness

## Current implementation priority

1. common session engine
2. `M3`
3. `M4`
4. `M5`
5. `M3-R`
6. `M2`
7. `M1`

## Routes

- `/consent`
- `/child-info`
- `/audio-check`
- `/session/[id]/practice`
- `/session/[id]/module/[code]`
- `/session/[id]/report`
- `/admin`

## Phase 2 assumptions

- `expected_modules` remains config-driven by age
- admin completion compares `completed_modules` against `expected_modules`
- `M5` is mandatory for age 5 and age 6
- `M3-R` is only expected for age 6
- practice is reusable and not scored
- repeated practice difficulty stores quality flags instead of a score
- module runtime stores provisional raw summaries only
- no percentile norms are implemented
- report language stays non-diagnostic
- `M1` and `M2` remain placeholders in this phase
- interruption-safe resume is implemented by persisting last completed item index and response log per module

## Quality flags stored

- `failed_practice`
- `interrupted_session`
- `audio_check_failed`
- `low_training_mastery`
- `possible_caregiver_assist`

## Report levels

1. `지금은 큰 우려 신호가 두드러지지 않음`
2. `반복 관찰이 권장됨`
3. `전문가 상담을 고려할 만한 신호가 보임`

These are observational guidance levels only. They are not diagnoses and do not imply percentile ranking.

## Getting started

```bash
npm install
npm run prisma:generate
npm run db:init
npm run dev
```

## Key files

- `src/lib/screening-config.ts`: frozen module map and expected modules
- `src/lib/module-definitions.json`: config-driven module runtime definitions
- `src/lib/session-runtime.ts`: session helpers, report logic, and quality-flag helpers
- `src/app/actions.ts`: guardian flow and admin server actions
- `src/app/api/session/[id]/module/[code]/progress/route.ts`: runtime persistence endpoint
