## M5 Content Draft

This document captures the normalized prototype content pack for `M5` phonological awareness.

## Prototype task structure

`M5-A`: syllable-level odd-one-out

- 4 spoken 2-syllable Korean words
- 3 share the same first syllable
- 1 is different
- 4 visual choices

`M5-B`: onset-phoneme odd-one-out

- 3 spoken 1-syllable Korean words
- 2 share the same onset consonant
- 1 is different
- 3 visual choices

This is still `provisional_prototype_content`. It is not normed, validated, or diagnostic.

## Prototype lexical policy

- Prefer familiar 1-2 syllable Korean nouns
- Allow rare 3-syllable exceptions only if they are highly familiar and easy to picture
- Any such exception must be marked with `review_needed` metadata for internal review
- Prefer words that can map cleanly to simple picture cards
- Avoid abstract vocabulary and regionally narrow vocabulary when possible

## Why these words were chosen

- They are concrete child-friendly nouns
- Most are easy to picture with simple illustrations
- They avoid abstract vocabulary
- They are short enough for a prototype listening task
- They keep the odd-one-out logic easy to explain in guardian-assisted testing

## Final prototype item sets

### M5-A practice

- `사과, 사자, 사탕, 토끼` -> odd one out: `토끼`

### M5-B practice

- `문, 말, 집` -> odd one out: `집`

### Age 5 M5-A

- `나비, 나무, 나팔, 토끼` -> `토끼`
- `모자, 모기, 모래, 사과` -> `사과`
- `기차, 기타, 기린, 바지` -> `바지`

### Age 5 M5-B

- `불, 밥, 책` -> `책`
- `차, 책, 물` -> `물`
- `문, 물, 꽃` -> `꽃`

### Age 6 additional M5-A

- `바지, 바다, 바람, 구름` -> `구름`
- `시계, 시소, 시장, 나무` -> `나무`

### Age 6 additional M5-B

- `집, 잼, 눈` -> `눈`
- `돌, 달, 불` -> `불`

## Asset and runtime notes

- Each item includes:
  - spoken prompt sequence
  - image keys
  - correct answer
  - difficulty label
  - optional local audio path placeholder
- Final audio files are not required yet
- If local audio is missing, runtime safely falls back to the current synthesized playback behavior

## What still needs expert review

- Whether each onset pair is developmentally clean enough for 5-year-olds and 6-year-olds
- Whether any nouns are less familiar than expected across regions or classrooms
- Whether the lexical policy should permit any 3-syllable exceptions in the final version
- Whether the age 6 set should use slightly harder contrasts in the final version
- Whether prompt wording should be simplified further for standardized administration
- Whether some image keys should be replaced with more culturally neutral or clearer objects

## Explicit limitations

- This content is prototype-grade only
- It should not be treated as validated screening content
- No percentile norms or diagnostic interpretations are attached
