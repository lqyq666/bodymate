# BodyMate

BodyMate is an offline, interactive anatomy-exploration whitebox. It keeps the full-body navigator, the focused local view, and the current action separate so users can inspect a structure without losing context.

## Run locally

This is a dependency-free static page. Open `index.html` in a modern Chromium browser with WebGL enabled, or serve the folder with any static HTTP server.

## Current scope

- Full-body navigation is independent from the focused detail camera.
- Selecting a region, mesh, label, or nearby item synchronizes one current structure.
- Isolation, nearby-structure visibility, labels, pulse, the coach bubble, session-only history, and example weekly progress are local demonstrations.
- Geometry, fibers, fascia, and body contours are procedural placeholders, not verified anatomical assets or medical advice.

The project intentionally does not include accounts, real training records, medical/rehabilitation recommendations, a real AI connection, or production anatomical assets.

## Verification target

Desktop: 1440 × 900. Mobile: 390 × 844. Respect keyboard focus and `prefers-reduced-motion`.

