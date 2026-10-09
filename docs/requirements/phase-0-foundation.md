# Feature: Phase 0 — Private couple foundation

## Goal

Enable two people to securely create accounts, join one private couple space, and maintain the basic relationship information needed by the future universe. This requirement covers Phase 0 (Epics 0.1–0.4) of `SPEC.md` and is the foundation for the Phase 1 MVP.

## Definition of Done

- [x] A new user can sign up with a unique email and a password of at least 8 characters that also meets the chosen authentication provider's security policy. Invalid input and duplicate accounts produce readable errors without exposing sensitive details.
- [x] An existing user can sign in, retain their session after a page refresh, and sign out. Protected data is inaccessible after sign-out.
- [x] Email confirmation gives a readable sign-in path if its link opens in a different browser from the sign-up form; expired or reused links show a distinct error.
- [x] An authenticated user without a couple can create one with a name and relationship start date, plus an optional nickname. Creation produces a unique couple ID, adds the creator as its first active member, and initializes an empty universe state.
- [x] A couple creator can generate an invitation bound to that couple, with an unguessable token and an explicit expiration time. The raw token is not stored in a form that can be used to join if the invitation store is exposed.
- [x] An authenticated partner can accept one valid invitation and join the existing couple. An expired, invalid, already-used, or revoked invitation fails with a readable result.
- [x] Invitation acceptance is atomic: concurrent attempts cannot add more than two active members, and a user already belonging to a different active couple cannot join or create another one in the MVP.
- [x] Both members can read their couple's name, relationship start date, member display names, avatars, timezone, and optional next-meeting date. Either member can update the settings the UI exposes, and the other sees the persisted changes after refresh.
- [x] Server-side or database authorization checks couple membership for every couple-scoped read and write. A user outside the couple cannot access its settings, invitation details, members, or empty universe state by changing an ID or calling the data API directly.
- [x] Database schema, constraints, indexes, and access policies needed for these flows are versioned in the repository and can be applied repeatably to a fresh environment.
- [x] Relevant automated checks cover the main success paths and security boundaries, including expired invitations, concurrent acceptance, the two-member limit, and cross-couple access; local build and repository skill loop pass.
- [x] `docs/architecture.md` records the selected application stack, authentication and session boundary, couple membership model, invite lifecycle, storage choice, and the authorization strategy before implementation is considered complete.

## Acceptance scenarios

1. **New relationship:** User A signs up, creates a couple, and reaches its empty private space. Refreshing the page retains access.
2. **Partner joins:** User A shares a valid invitation; User B signs up or signs in, accepts it, and reaches the same couple space without creating another universe.
3. **Membership limit:** A third signed-in user tries the invitation, including at the same time as User B. Only one acceptance can fill the second slot; the third user gains no couple access.
4. **Expired invitation:** Acceptance after the stored expiration fails and does not change membership.
5. **Private data:** A user from another couple requests User A's couple-scoped records by ID. The data layer denies the request even if the UI route is bypassed.
6. **Profile sync:** One partner updates an allowed couple setting; the other sees the persisted value after refresh.
7. **Sign out:** A signed-out browser cannot retrieve protected couple data with its previous session.

## Constraints

- Required behavior and product scope come from `SPEC.md` Phase 0. The site is private by default and has at most two active members per couple in the MVP.
- The application must remain usable on desktop and supported mobile browsers. Forms need accessible labels, keyboard operation, and readable validation errors.
- Authentication, invite redemption, membership limits, and authorization must be enforced beyond client-side controls. Do not put privileged service credentials in browser bundles.
- Store timestamps in a consistent absolute representation; store a validated IANA timezone for couple-facing dates. Define how the relationship start date is interpreted in that timezone.
- Secret invitation tokens must have a bounded lifetime and must not appear in application logs or analytics. Invitation links may carry a token, so avoid sending it to unrelated third-party resources.
- Schema and policy changes must be repeatable and reviewable. Use repository-managed migrations rather than manual production-only changes.
- Follow `AGENTS.md`: requirement-first work, architecture decisions in `docs/architecture.md`, `scripts/run-skills.sh`, and PR/CI validation.

## Out of scope

- Memory creation, media uploads, memory stars, 3D rendering, and secret capsules (Phase 1).
- Daily check-ins, realtime synchronization, Same Moment, quests, trips, milestones, AI summaries, and public/social features.
- Password reset, email verification, multi-factor authentication, and account deletion unless the selected authentication provider makes any of these mandatory for a secure Phase 0 release; document such a dependency before adding it.
- Native mobile applications, payments, and subscriptions.
