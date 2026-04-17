## Module Readiness Matrix

This document summarizes the internal readiness state of each module in the `v0-internal-freeze-4A` prototype.

## Current matrix

| Module | Runtime status | Content status | Fallback audio | Reduced scope | Acoustic not final | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `M1` | Implemented | Provisional | Yes | No | Yes | Staircase-ready acoustic prototype for `/바/` vs `/다/` |
| `M2` | Implemented | Provisional | Yes | No | No | Speech-in-noise prototype with manifest-backed pre-learning metadata |
| `M3` | Implemented | Provisional | Yes | No | No | Forward working-memory prototype using familiar monosyllabic nouns |
| `M3-R` | Implemented | Provisional | Yes | No | No | Reverse working-memory prototype using the shared M3 noun pool |
| `M4` | Implemented | Provisional | Yes | Yes | No | Reduced-scope pattern prototype with shorter lengths than full research design |
| `M5` | Implemented | Provisional | Yes | No | No | Real Korean phonological-awareness prototype content |

## Reading the matrix

- `Implemented` means the module runs end-to-end in the current guardian/session flow
- `Provisional` means the module is still prototype content and not validated
- `Fallback audio` means final local audio assets are not fully present and the runtime uses the safe fallback path
- `Reduced scope` means the current runtime intentionally covers a smaller task shape than the full intended research design
- `Acoustic not final` marks modules that still need real acoustic asset production before a more faithful prototype pass

## Current readiness interpretation

- The full module family is now present for internal testing
- The prototype is structurally complete enough for controlled manual runs
- Asset production is still the main remaining readiness gap
- `M4` and `M1` should be interpreted with extra care because their current prototype scope or acoustic assets are explicitly incomplete
