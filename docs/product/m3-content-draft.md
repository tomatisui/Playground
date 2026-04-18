## M3 Content Draft

This document captures the first real prototype content pack for `M3` auditory working memory forward.

This content is still `provisional_prototype_content`. It is not normed, validated, or diagnostic.

## Prototype noun pool

The current familiarization and sequence pool uses highly familiar monosyllabic Korean nouns:

- `공`
- `눈`
- `밥`
- `집`
- `책`
- `문`
- `물`

Why this pool was chosen:

- The nouns are high-frequency and concrete
- They are easy to picture with simple cards or icons
- Monosyllabic items reduce extra phonological load in a forward-memory prototype
- The pool is small enough for repeated manual testing without changing runtime logic

## Choice-count and familiarization structure

- familiarization pool size: `7`
- visible choices during recognition, practice, and test: `6`
- current maximum sequence length: `5`

This keeps one distractor available at max span while preserving a slightly larger familiarization pool.

## Practice structure

- familiarization first across all 7 nouns
- lightweight recognition check after familiarization
- Practice round 1:
  - single-item sequence
  - `공`
  - 1 answer slot
  - 6 visible image+text choices
- Practice round 2:
  - two-item sequence
  - `공, 집`
  - 2 answer slots
  - 6 visible image+text choices

Practice remains unscored and is only used to confirm that the child understands the response format.

## Test sequence examples

Age 5 core prototype set:

- `눈, 밥`
- `문, 물`
- `공, 집, 책`
- `눈, 문, 밥, 물`

Age 6 additional prototype set:

- `물, 책, 공, 집`
- `집, 눈, 문, 밥, 공`

Each item includes:

- spoken prompt text
- prompt sequence tokens
- response choices
- correct answer
- difficulty label
- optional local audio placeholder

## What still needs expert review

- Whether this noun pool is familiar enough across different preschool contexts
- Whether any noun pairings create unintended semantic chunking effects
- Whether age 6 should include more 4-item sequences in the final prototype
- Whether final recorded prompts should use a fixed pace or subtle inter-word pauses
- Whether image-key mappings should be simplified for production asset prep

## Explicit limitations

- This is prototype-grade content only
- It should not be treated as validated screening content
- No percentile norms or diagnostic interpretations are attached
