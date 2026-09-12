# Reproducibility and generated-artifact audit

## Clean-clone recipe

Clone the repository into an empty directory. Do not copy `node_modules`, `_build`, browser caches, untracked files, or anatomy prototype material. Run:

```text
npm ci
npm run build
npm run check
npm run moonbit:stats
```

Open the resulting `index.html` directly with `file://` in Chromium. The runtime must remain local; normal verification does not download anatomy sources. An intentional source refresh is separate and requires `BODYMATE_ALLOW_NETWORK=1`.

## Generated ownership

| Source | Builder invoked by `npm run build` | Committed output | Freshness guard |
| --- | --- | --- | --- |
| `moonbit/core/*.mbt` | `scripts/build-moonbit.mjs` | MoonBit block embedded in `index.html` | `scripts/check-generated.mjs` recompiles and compares it |
| MoonBit `bodymate_domain_registry_v1` | `scripts/build-moonbit-registry.mjs` | `generated/anatomy-registry.json`, `src/anatomy/neck-registry.mjs` | Registry projection and byte/semantic comparison |
| `src/anatomy/neck-registry.mjs` | `scripts/build-anatomy-registry-runtime.mjs` | `assets/runtime/anatomy-registry.js` | Regenerated comparison |
| `src/coach-c/*.mjs` and MoonBit bundle | `scripts/build-coach-query-runtime.mjs` | `assets/runtime/coach-query-runtime.js` | Regenerated comparison |
| `src/root-scm/*.mjs`, registry, frozen GLB | `scripts/build-root-scm-runtime.mjs` | `assets/runtime/root-scm-runtime.js` | Regenerated comparison and GLB integrity tests |

`npm run check` deliberately fails when any listed artifact is stale. The checker regenerates in place only to compare, then restores the original bytes (including checkout line endings), so a successful check leaves tracked files unchanged. `assets/anatomy/human-atlas/neck-muscles.glb` is a frozen source asset, not a normal generated runtime artifact; its SHA-256 and 14 mapped nodes are validated by tests.

## Repository hygiene guard

`scripts/audit-repository-hygiene.mjs` inspects tracked text files for credential-shaped values and accidental user-specific Windows, macOS, or Linux absolute paths. It is part of `npm run check` and adds no dependency.
