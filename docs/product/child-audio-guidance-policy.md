# Child Audio Guidance Policy

## Purpose

This prototype treats any directly child-facing interaction as audio-guided by default. Preschool users in the 5-6 age band should not need to rely on text-only instructions to continue a task safely.

## Child-Facing Screens

- audio check
- familiarization stages
- recognition check stages
- practice stages
- module test stages
- interruption and recovery screens where the child must continue
- retry and repeat-instruction situations

Guardian-only screens such as consent, child info entry, and admin do not require mandatory child audio guidance.

## Required Behavior

Each child-facing screen should provide the same basic pattern:

1. auto-attempt the spoken instruction on first entry
2. show a large `설명 듣기` button when the child needs to start or replay the first instruction
3. keep a persistent `다시 듣기` control visible during the task

Instructions should usually be one short sentence. They should stay child-friendly, non-diagnostic, and free of evaluative wording.

## Instruction Before Stimulus

For any task stage that includes a target sound or spoken stimulus, playback must follow this order:

1. instruction audio
2. short delay
3. task stimulus

The prototype currently uses a short delay of about 700 ms. Stimulus playback must not begin before the instruction finishes, and repeated taps should not create overlapping playback.

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
