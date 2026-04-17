## Manual Test Matrix

This matrix covers the minimum internal manual checks for the `v0-internal-freeze-4A` build.

## Core runs

### Age 5 full run

- Start from `/consent`
- Create a 5-year-old session
- Pass audio check
- Complete `M1`, `M2`, `M3`, `M4`, `M5`
- Confirm report renders
- Confirm admin shows the session as complete

### Age 6 full run

- Start from `/consent`
- Create a 6-year-old session
- Pass audio check
- Complete `M1`, `M2`, `M3`, `M3-R`, `M4`, `M5`
- Confirm report renders
- Confirm admin shows the session as complete

## Stability checks

### Interrupted session resume

- Start any session
- Complete part of a module
- Refresh or leave and return to the same session route
- Confirm the module resumes from saved state
- Confirm admin shows the interruption-related visibility

### Failed practice handling

- Start a session
- Intentionally fail practice twice on one module
- Confirm:
  - the flow still allows moving forward
  - quality flags are stored
  - admin shows practice runs and failures

### Fallback audio path

- Run any module with missing final local audio
- Confirm playback still works through safe fallback behavior
- Confirm admin asset matrix marks fallback audio in use

## Admin inspection flow

- Open `/admin`
- Confirm build label is visible
- Confirm prototype freeze summary is visible
- Confirm asset readiness matrix is visible
- Confirm internal reset/seed utilities are visible
- Open a real or seeded session entry
- Confirm per-module status table shows:
  - status
  - practice outcome
  - item counts
  - fallback usage
  - reduced/acoustic flags
  - active thresholds or staircase level where relevant

## Seed utility checks

- Use `샘플 세션 일괄 생성`
- Confirm seeded sessions appear in admin
- Use `5세 샘플 런 생성`
- Confirm a complete age-5 sample run is added
- Use `6세 샘플 런 생성`
- Confirm a complete age-6 sample run is added
- Use `모든 세션 초기화`
- Confirm all sessions are removed
