# Feature: Phase 3 — Future dreams

## Goal

Deliver Epic 3.9 from `SPEC.md`: keep a shared list of things the couple hopes to do, show each open hope as a distant object, and turn it into a permanent memory when they mark it done.

## Definition of Done

- [x] Either member can save a dream with a title, optional description, optional target date, a memory category, and status `dream` or `planned`.
- [x] An open dream (`dream` or `planned`) creates one `DISTANT_OBJECT` far outside the memory-star band. A second save does not add a second object for the same dream.
- [x] Marking the dream `completed` creates one ordinary memory (title, description, category, and a memory date of the target date when that date is already here, otherwise the couple's local today) and removes the distant object. The dream row stays, linked to that memory. Completing again is rejected.
- [x] `/universe` lists dreams, lets a member add one, change an open dream between `dream` and `planned`, mark it done, or delete it while it is still open. The canvas draws open dreams as faint distant marks. A completed dream opens the memory it became.
- [x] A member of another couple cannot read these dreams, and deleting or completing one does not touch the other couple.
- [x] Migration, RLS, and database checks cover the distant object, the one-way completion into a memory, and privacy.
- [x] `docs/architecture.md` records future dreams as distant objects that become memory stars.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Distant hope:** Saving "See the aurora" places one faint object beyond the star band and lists it as a dream.
2. **Plan:** Changing that dream to planned keeps the same single distant object.
3. **Done:** Marking it completed removes the distant object, creates a memory star with the same title and category, and keeps the dream row pointing at that memory.
4. **Once:** Updating the completed dream is rejected.
5. **Privacy:** Another couple cannot read the dream.

## Constraints

- Keep the canvas projector. The distant mark is an extra draw pass. No React Three Fiber.
- Completion writes a real memory through `private.create_memory`, so the star, relationship event, and memory stay in one transaction. The distant object does not remain beside the new star.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, pull request into `main`, and green CI.

## Out of scope

- AI naming, reminders, and turning a dream into a quest or trip.
