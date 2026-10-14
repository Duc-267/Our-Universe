# Feature: Universe visual refresh

## Goal

Give the universe one consistent, friendly look that matches the rubber-duck mascot: a flat storybook night sky, sticker-like memory stars, and soft, rounded app chrome. Behavior from Phase 1 and Phase 2 stays the same.

## Definition of Done

- [x] The sky is a flat illustrated night: layered gradient, slow parallax clouds, a crescent moon, and twinkling background stars. Today's moods still tint the sky, and rain still falls on a sad day.
- [x] Each memory appears as its chosen icon drawn as a sticker: category color, dark outline, drop shadow, and gloss. Bright memories are larger and carry orbiting sparkles. The selected memory shows a ring and its title.
- [x] The duck sits inside the field of memories: objects nearer the camera than the duck draw in front of it, farther ones behind it, and an orbit ring passes behind and in front of it.
- [x] A new star pops in with a short scale and sparkle burst. The duck still hops on a new star and shows a heart on a new check-in.
- [x] The universe page puts the scene first, with the relationship age and "Add a memory" over the sky, today's check-in beside it on wide screens and below it on narrow ones, and the star list underneath.
- [x] The star list, check-in moods, buttons, inputs, dialogs, and headings use the same palette, rounded display font, and outline style across the app.
- [x] Pointer, touch, keyboard, zoom, and the semantic star list keep working. `prefers-reduced-motion` stops twinkle, drift, pop, and mascot motion.
- [x] Lint, typecheck, local database checks, production build, and the skill loop pass.

## Constraints

- No new runtime dependency for drawing. The scene stays on the existing 2D canvas plus the SVG mascot.
- Fonts load through `next/font` so no third-party request happens at runtime.
- Colors keep readable contrast for text on cards and buttons.
- Follow `AGENTS.md`: requirement first, architecture note, skill loop, PR, and CI.

## Out of scope

- New data, schema changes, or new cosmic object types.
- Same Moment, capsules, quests, and photos.
