# Feature: Phase 1 — Photos and secret capsules

## Goal

Complete the Phase 1 exit criteria in `SPEC.md` ("images work", "secret capsules work") by delivering Epics 1.5 (Photo Upload), 1.6 (Secret Capsule), and 1.7 (Capsule Cosmic Object). This finishes the scope that `phase-1-universe-memories.md` deferred.

## Definition of Done

- [x] A memory author can attach up to six photos while creating or editing a memory, and remove them later. JPEG, PNG, and WebP are accepted; HEIC/HEIF is converted in the browser before upload.
- [x] Before upload, the browser resizes each photo into an optimized version (longest edge 1600 px) and a thumbnail (longest edge 320 px). The original file is never uploaded. Originals over 20 MB are rejected in the browser, and the storage bucket rejects any object over 5 MB or with a type other than WebP/JPEG.
- [x] Photos are stored in a private bucket and delivered through short-lived signed URLs. Storage RLS limits reads to members of the owning couple and uploads to the memory author's own memory folder. The attach function verifies both files exist and enforces the six-photo limit.
- [x] The universe and memory lists load only thumbnails. The optimized version is requested only when a photo is opened full size in the memory detail.
- [x] A member can seal a capsule with a title, message, optional image, and a future unlock date (calendar date in the couple timezone).
- [x] Before unlock, the partner can see the capsule object, creator, and unlock date, but not its title, message, or image, even through direct Data API or Storage calls.
- [x] When the unlock time is reached, either member can open the capsule. The first opening stores its timestamp and opener, and the content then remains accessible to both members.
- [x] A sealed capsule appears in the universe as a comet that looks different from memory stars. A ready-to-open capsule glows, and an opened capsule becomes a letter. Selecting a sealed capsule shows "Locked until [date]."
- [x] Schema, RLS, storage policies, and functions are in a new migration with automated checks for privacy before unlock, opening rules, photo limits, and storage path authorization.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Photo memory:** A member creates a memory with two photos. The universe shows a thumbnail in the star label and memory detail; opening a photo loads the optimized image.
2. **HEIC:** An iPhone HEIC photo is converted in the browser and uploaded as WebP or JPEG.
3. **Limits:** A seventh photo, a 25 MB original, or a direct upload into another couple's folder is rejected.
4. **Sealed capsule:** Alex seals a capsule for next month. Blair sees a comet and "Locked until [date]" with Alex as creator; Blair's direct reads of the capsule content and image return nothing.
5. **Opening:** After the unlock time, Blair opens the capsule. The opened timestamp is stored, the comet becomes a letter, and both members can read it afterward.
6. **Privacy:** A user from another couple cannot read the capsule, its content, or any photo object.

## Constraints

- Use Supabase Storage with a private bucket. Cloudflare R2 needs a separate account and credentials, and Supabase Storage keeps media authorization in the same PostgreSQL RLS model. The browser uses only the public Supabase key and the user's session.
- Content that must stay hidden before unlock lives in a separate table whose RLS hides it from the partner; column-level hiding in client code is not sufficient.
- Every write goes through private security-definer functions that re-check membership, authorship, and timing.
- Follow `AGENTS.md`: dedicated branch from `main`, requirement first, architecture decision recorded, skill loop, PR into `main`, and green CI.

## Out of scope

- Server-side image transforms, video, and photo captions.
- Editing a capsule after it is sealed, or choosing a recipient other than the partner.
- Notifications when a capsule unlocks.
