# Submission scorecard

This is a factual release-candidate assessment, not a product claim.

| Dimension | Status | Evidence and remaining risk |
| --- | --- | --- |
| Product completeness | RISK | The 14-mesh explorer, sets, movements, and comparisons work; anatomy and movement coverage are intentionally narrow. |
| Engineering quality | PASS | Typed MoonBit domain boundary, generated-artifact gate, deterministic tests, and a clean-clone workflow. |
| Explainability | PASS | Reviewer quickstart, demo script, architecture, evidence, and review guide explain each domain path. |
| UX | RISK | Desktop/mobile `file://` rendering is captured in Chromium, while full mesh-pick/orbit/card interaction requires reviewer manual replay because the available automation provider blocks interactive `file://` control. This remains a prototype and does not replace formal accessibility/usability study. |
| MoonBit depth | PASS | Anatomy registry/resolvers/StructureSet/comparison plus complete-body motion definitions, parameters, participation profiles, playback session, pose intents, validation, events, and snapshots live in MoonBit. |
| Reproducibility | PASS | `npm ci`, build, check, stats, and direct `file://` launch are documented and verified from a clean clone. |
| Testing | PASS | MoonBit, Node contracts, artifact freshness, GLB/provenance, safety, and hygiene are gated. |
| Asset provenance | PASS | Pinned Human Atlas / BodyParts3D provenance, CC BY attribution, manifest, and frozen GLB hash are committed. |
| Safety | PASS | Health text rejects diagnosis/treatment use and prevents health queries from mutating anatomy state. |
| Known risks | RISK | A small evidence catalog, browser/WebGL variability, and manual browser interaction acceptance remain. |

No BLOCKER is known after the Stage 6 acceptance checks.
