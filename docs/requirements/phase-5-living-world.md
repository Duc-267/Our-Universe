# Feature: Phase 5 — Living world (LD-0.1 + LD-0.4)

## Goal

Turn `/universe` from a canvas beside a column of panels into one living world: a small floating island with the duck's pond, a garden, a house, and a mailbox, circled by the couple's sky. Every existing feature is reached from the place it belongs to in that world. Source stories: LD-0.1 and LD-0.4 in `docs/backlog/ld-0-world-foundation.md`.

## Definition of Done

- [x] `/universe` fills the viewport with the world. The page does not scroll on desktop or on a 390 px phone, and the header floats over the sky.
- [x] A floating island sits at the center of the sky projection. It shows a pond with the duck, a garden bed, a house with a lit window and chimney smoke, a mailbox, a stone path, and a small waterfall off the island edge. Memory stars and every other sky object still orbit in 3D and pass behind and in front of the island and duck.
- [x] The default ornaments around the duck (orbit rings, halo, orbiting motes and hearts) are gone.
- [x] Pond, Garden, House, and Mailbox on the island are buttons. Each opens its zone drawer. Hover and keyboard focus show the zone name, and the island marks the zone whose drawer is open.
- [x] A zone dock offers Pond, Garden, Sky, Home, and Mailbox plus a central "New memory" action. It shows a small dot on Pond when a Same Moment is open, on Sky when a quest is open, and on Mailbox when a capsule is ready to open. No dot asks the user to check in or come back.
- [x] Zone drawers replace the side column and the lists under the canvas. Pond shows today's mood and Same Moment. Garden shows the new-memory action, the memory list, and constellations. Sky shows quests, trips, dreams, milestones, and cosmic events. Mailbox shows capsules and the seal-capsule action. Home shows days together, the next anniversary, the partner invitation when it is still possible, and settings. Every Phase 1–3 action stays reachable within two steps.
- [x] On desktop the drawer opens on the right and the island moves left so it stays visible. On a phone it is a bottom sheet. Escape and the close button close it, and focus returns to the control that opened it.
- [x] The empty universe still reads "Your universe begins here." with the invite action, without covering the island.
- [x] Reduced motion stops idle drift, the waterfall, the smoke, and the ripples. The scene keeps its keyboard controls, and every object stays reachable from a drawer list.
- [x] `docs/architecture.md` records the island world. The LD-0.1 and LD-0.4 stories and the backlog status table match what shipped.
- [x] Lint, typecheck, database checks, and the production build pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Arrive:** A signed-in member opens `/universe` and sees the island and duck centered in the sky, with no page scrollbar.
2. **Zone:** Clicking the garden on the island opens the Garden drawer listing memories. Choosing a memory highlights its star and opens its detail.
3. **Dock:** With a ready capsule, the Mailbox dock button shows a dot, and the mailbox flag on the island is raised.
4. **Phone:** At 390 px the dock sits at the bottom and a zone opens as a bottom sheet over the world.
5. **Keyboard:** Tab reaches the dock, Enter opens a zone, Escape closes it and returns focus to the dock button.

## Constraints

- Keep the dependency-free canvas projector and the two-canvas depth split. The island is a DOM SVG layer between the back and front canvases, like the duck. No React Three Fiber, no new runtime dependencies.
- No schema change. Reuse the existing panels and dialogs; the drawer restyles them for cohesion.
- Product guardrails G1–G8 in `docs/product/little-duck-prd.md`, especially no nagging indicators (G4) and reduced motion with keyboard alternatives (G7).
- Follow `AGENTS.md`: dedicated branch from `main`, requirement first, architecture note, pull request into `main`, and green CI.

## Out of scope

- Time of day (LD-0.3), per-member timezone (LD-0.2), duck activities and growth (LD-1), letters (LD-2), garden plants (LD-3), the house interior (LD-5).
- Translating the interface; copy stays in English until LD-8.3.
