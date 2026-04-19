# Child Audio Guidance Policy

## Purpose

This prototype treats any directly child-facing interaction as audio-guided by default. Preschool users in the 5-6 age band should not need to rely on text-only instructions to continue a task safely.

## Parent-Guided Setup Screens

- consent
- child info
- audio check

These setup screens are parent-guided. They should stay simple, readable, and free of debug-heavy metadata, but they do not need to follow the same child-task copy rules as the actual test stages.

## Child-Facing Screens

- familiarization stages
- recognition check stages
- practice stages
- module test stages
- interruption and recovery screens where the child must continue
- retry and repeat-instruction situations

Admin remains guardian-only and does not require child audio guidance.

## Required Behavior

Each child-facing screen should provide the same basic pattern:

1. wait briefly on first entry so the child can orient to the screen
2. auto-attempt the spoken instruction after that short pause
3. show one clear child-facing playback control only

The shared child playback policy is:

- before the first completed playback, show a single large `설명 듣기` button
- during playback, show a single locked control such as `듣는 중...`
- after playback, show a single replay control such as `다시 듣기`
- do not show duplicated child-facing playback buttons at the same time

Instructions should usually be one short sentence. They should stay child-friendly, non-diagnostic, and free of evaluative wording.

## Child-View Simplification

Child-facing task screens should keep the visible surface simple. The main task area should show only:

- a small guardian-facing stage label
- a short Korean instruction
- one clear listen or replay control
- the task UI itself
- a primary action button when the step needs one

Internal prototype labels, English module metadata, fallback notices, and debug-oriented copy should stay out of the main child-facing task surface. Those details may remain in admin or internal tooling.

The current child-facing title policy uses a two-layer structure:

- a small guardian-facing stage label such as `오디오 확인`, `먼저 들어보기`, `연습`, or `검사`
- a larger child-facing action sentence such as `소리를 잘 들으면 시작해요` or `말을 잘 듣고 같은 순서로 골라요`

Avoid exposing technical or internal stage terms such as `친숙화`, `recognition check`, `module runtime`, `INTERNAL PROTOTYPE`, `fallback_assets`, or `visible choices` in the main child-facing task surface.

## Image-Supported Choices

For preschool users who may not read fluently, answer choices should use image-supported cards whenever the task depends on choosing among words or items. If final local images are not ready yet, the runtime should show a child-friendly placeholder visual tile together with the Korean label. Internal placeholder codes or asset abbreviations must not be shown to the child.

## Instruction Before Stimulus

For any task stage that includes a target sound or spoken stimulus, playback must follow this order:

1. instruction audio
2. short delay
3. task stimulus

The prototype currently uses a short delay of about 700 ms. Stimulus playback must not begin before the instruction finishes, and repeated taps should not create overlapping playback.

## First-Entry Orienting Delay

On first entry to a child task screen, the prototype should leave a short orienting gap before the first autoplay attempt. The current policy target is about 800-1200 ms. This gives the child a moment to look at the screen before hearing the spoken cue while still preserving a quick, guided flow.

## Config and Fallback Policy

- Instruction text and optional instruction-audio references should live in manifest or config where practical.
- If final local audio is missing, the runtime may fall back to safe synthesized speech or safe prototype playback.
- Fallback behavior must preserve the same instruction-before-stimulus order.

## Current Runtime Notes

- Generic practice and module runners use a shared child-audio guidance component.
- M3 and M3-R familiarization, recognition, practice, and test stages follow the same reusable guidance pattern while keeping their module-specific task wording.
- Audio check also follows the same listen-first and replayable guidance pattern.

## Why Text-Only Is Not Enough

Preschool users may not read fluently, may be unfamiliar with task conventions, and may lose track of the next action if the interface depends on written instructions alone. Audio guidance keeps the prototype safer, more consistent, and more realistic for internal testing.
