# Test matrix

`npm run check` is the project acceptance command. It runs MoonBit validation, Node cross-language contracts, generated-artifact checks, and repository hygiene checks. `npm run moonbit:stats` is the canonical, non-hand-maintained size report; effective LOC excludes blank lines, comment-only lines, and generated code.

| Area | Evidence | Failure detected |
| --- | --- | --- |
| MoonBit unit tests | `moon test --target js` | Invalid registry entries, resolver behavior, StructureSet/movement/comparison algebra, rejected actions, state/event/snapshot regressions |
| Cross-language contracts | Node tests using the embedded MoonBit bundle | JS bypasses, malformed wire parsing, action-before-render violations, V3/V4/V5 snapshot incompatibility |
| Registry and GLB integrity | anatomy/registry Node tests | A changed GLB hash, missing node, duplicate stable/source identity, or divergence from the canonical 14-entry registry |
| Structure resolver | MoonBit resolver and integration tests | Exact, ambiguous, family/set, Chinese/English, and health-query classification regressions |
| Movement evidence | MoonBit movement tests and Node integration tests | Unknown movement, missing evidence, duplicate member, or renderer-owned movement mapping |
| Comparison | MoonBit comparison tests and Node integration tests | Non-deterministic union/intersection/difference, lost left/right roles or provenance, or health-driven comparison mutation |
| Generated artifacts | `scripts/check-generated.mjs` | A committed runtime/registry/index artifact that differs from its builder output |
| Offline/file boundary | browser-contract and runtime tests | Runtime CDN/API/anatomy fetches or a non-local embedded runtime dependency |
| Desktop/mobile acceptance | manual Chromium `file://` pass at 1440×900 and 390×844 | Layout, labels, card, Coach C, interaction, or viewport regressions not observable in unit tests |
| Safety | MoonBit and Node health-query tests | Diagnosis/treatment copy, inferred culprit structure, or health input that mutates anatomy state |
| Repository hygiene | `scripts/audit-repository-hygiene.mjs` | Tracked credential patterns or accidental local user paths |

Browser acceptance is deliberately documented separately from headless contracts because mesh picking, orbit, and WebGL labels require a real browser interaction pass.
