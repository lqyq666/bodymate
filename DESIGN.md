# BodyMate Design System

## Overview

BodyMate is a desktop-first anatomy exploration interface. A pale lavender-gray shell, near-black typography and electric-blue actions frame a silver-white anatomy studio. The central body is the visual focus; the independent standing reference is smaller.

## Color

- Ink: `#16171E`
- Muted text: `#606371`
- Primary blue: `#3144FF`
- Background: `#EEEFF9`
- Surface: `#F9F9FD`
- Separator: `#D9DBE7`

Palette and tactile references: [Zhongyin enterprise page](https://ai.zhongyinedu.com/enterprise), inspected September 13, 2026. Keep anatomical muscle activity red and the sculpture white; UI blue belongs to primary actions, focus and selection.

## Typography

Use the system-friendly Inter / Segoe UI / PingFang SC / Microsoft YaHei sans-serif stack. Maintain a compact product scale and favor direct labels over marketing copy.

## Layout

At desktop width: one flexible main stage with a small foreground reference and one continuous action sidebar. The model count is a compact status row, not a separate metric card. The query input stays at the bottom while explanations and parameters may scroll.

At 900px and below, the stage sits above the action panel. During movement the two canvas regions do not overlap. At 520px and below, search occupies its own header row. There is no utility rail, retired shoulder page, skin overlay or footer.

## Interaction

Near-black pills identify the active view; blue action rows identify the playing motion. Hover inverts an action row, lifts it slightly and rotates its arrow. `bodymate_ui_feedback_v1` owns the bounded pointer response (1.5px lateral shift, 2px lift, 2-degree tilt, 200ms return). JavaScript normalizes DOM coordinates and applies returned CSS values. Touch/coarse pointers and reduced motion produce no spatial feedback. CSS also suppresses arrow transforms and transitions for reduced motion.

Use named controls, visible blue keyboard focus, readable Chinese labels, and at least 44px touch targets on the main mobile controls. Selected actions remain distinguishable without motion.
