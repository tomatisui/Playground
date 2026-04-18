## M3 Practice Flow

This document records the current prototype practice flow for `M3` and its aligned reverse-order variant `M3-R`.

## Flow order

1. Familiarization
2. Lightweight recognition check
3. Practice stage 1
4. Practice stage 2
5. Module runtime

This flow is internal, prototype-safe, and non-diagnostic.

## Familiarization

- Uses the shared 7-word noun pool:
  - `공`, `눈`, `밥`, `집`, `책`, `문`, `물`
- Each item is shown with:
  - image placeholder / image key
  - Korean text label
  - tap-to-hear audio with safe fallback

## Recognition check

- Runs after familiarization
- Uses a lightweight 6-choice follow-up check
- Is used only to estimate prototype training mastery

## Practice stage 1

- Instruction audio/text first:
  - `말을 잘 듣고 같은 순서로 고르세요.` for `M3`
  - reverse-order variant for `M3-R`
- Wait about `700ms`
- Then play the target audio sequence
- Show `1` answer slot
- Show `6` visible image+text choices
- Allow filling the slot by tapping a choice

## Practice stage 2

- Instruction audio/text first
- Wait about `700ms`
- Then play the target audio sequence
- Show `2` answer slots
- Show `6` visible image+text choices
- Allow filling the slots in order
- Allow removing a filled item by tapping the slot

## Runtime notes

- Practice remains unscored
- Playback order is always:
  - instruction
  - short delay
  - target sequence
- Repeated taps are blocked while playback is active
- If local audio is missing, safe fallback playback still preserves the same order
