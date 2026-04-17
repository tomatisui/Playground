## Preschool Listening Screen Prototype

Mobile-first web prototype for a non-diagnostic preschool listening-risk screening platform using Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Frozen module structure

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

## Implementation priority

1. common session engine
2. `M3`
3. `M4`
4. `M5`
5. `M3-R`
6. `M2`
7. `M1`

## Current prototype assumptions

- `expected_modules` is config-driven by age and used for admin completion checks
- `M5` is mandatory for both age 5 and age 6
- `M3-R` is only expected for age 6
- module tracking is binary in this phase: complete or not complete
- percentile norms are intentionally not implemented yet
- parent-facing result copy stays non-diagnostic

## Getting started

```bash
npm install
npm run prisma:generate
npm run db:init
npm run dev
```

## Key files

- `src/lib/screening-config.ts`: frozen module map, priority, and session-engine helpers
- `src/app/actions.ts`: server actions for admin completion updates
- `src/app/page.tsx`: mobile-first prototype UI
- `prisma/schema.prisma`: Prisma data model
- `prisma/migrations/0002_screening_prototype/migration.sql`: SQLite prototype tables and demo records
