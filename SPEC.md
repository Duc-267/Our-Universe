# Our Universe

## 1. Product Overview

**Our Universe** là một private digital space dành cho các cặp đôi yêu xa hoặc muốn lưu giữ hành trình của mối quan hệ theo cách trực quan và có tính tương tác.

Thay vì lưu kỷ niệm dưới dạng album, timeline hoặc feed truyền thống, mỗi hoạt động của hai người sẽ dần tạo nên một **vũ trụ riêng**.

Ví dụ:

- Memory → Star
- Important memory → Bright Star
- Trip → Planet
- Anniversary → Moon
- Same Moment → Twin Stars
- Secret Capsule → Comet / Mysterious Object
- Long-term milestone → Cosmic Event
- Group of related memories → Constellation

Mục tiêu dài hạn là sau nhiều tháng hoặc nhiều năm, mỗi couple sở hữu một universe hoàn toàn khác nhau và phản ánh chính lịch sử mối quan hệ của họ.

---

# 2. Product Vision

## Vision

Biến lịch sử của một mối quan hệ thành một thế giới sống có thể nhìn thấy, khám phá và tiếp tục xây dựng.

Our Universe không phải:

- chat app
- relationship therapy app
- task management app
- social network

Our Universe là:

**Digital relationship world + memory archive + cozy interaction experience.**

---

# 3. Core Product Principles

## 3.1 Private by default

Universe chỉ thuộc về hai người trong relationship.

Không có:

- public profile
- public feed
- follower
- like từ người ngoài
- social ranking

---

## 3.2 Every interaction leaves a trace

Mỗi hành động có ý nghĩa nên tạo ra một thay đổi nhỏ trong universe.

Ví dụ:

- tạo memory → xuất hiện star
- hoàn thành quest → xuất hiện cosmic item
- tạo capsule → xuất hiện locked object
- milestone → thay đổi universe

---

## 3.3 History over productivity

Ứng dụng không tạo áp lực:

- không guilt trip khi mất streak
- không đánh giá chất lượng relationship
- không bắt buộc check-in mỗi ngày

Nếu người dùng không sử dụng một thời gian, universe chỉ trở nên yên tĩnh hơn.

---

## 3.4 Discovery over dashboard

Landing screen chính là universe.

Không ưu tiên dashboard chứa nhiều số liệu.

Người dùng nên cảm thấy họ đang:

**exploring their relationship**

thay vì:

**managing their relationship**

---

# 4. Primary Users

## Persona A — Long-distance couple

Hai người sống ở hai thành phố hoặc quốc gia khác nhau.

Needs:

- cảm giác cùng chia sẻ một không gian
- lưu lại những khoảnh khắc nhỏ
- có hoạt động để cùng làm
- có countdown hoặc anticipation trước ngày gặp nhau

---

## Persona B — Couple who likes memories

Không nhất thiết yêu xa nhưng thích:

- lưu ảnh
- anniversary
- trips
- shared experiences
- relationship timeline

---

# 5. Key Product Entities

```text
User
Couple
Relationship

Memory
Daily Check-in
Same Moment
Capsule
Quest
Milestone
Trip
Reaction

Relationship Event
Cosmic Object
Constellation

Monthly Summary
Yearly Wrapped
```

---

# 6. Universe Mapping

| Relationship Event | Universe Object |
|---|---|
| Normal Memory | Star |
| Important Memory | Bright Star |
| Same Moment | Twin Stars |
| Trip | Planet |
| Anniversary | Moon |
| Capsule | Comet / Unknown Object |
| Weekly Quest | Cosmic Fragment |
| Major Milestone | Cosmic Event |
| Related Memories | Constellation |
| Difficult period overcome | Crater |
| Long period of activity | Aurora |
| Long call | Binary Star |
| Shared Song | Pulsar |
| Future Plan | Distant Object |

Universe Engine quyết định visual representation dựa trên metadata của event.

---

# 7. Product Roadmap

Product được chia thành:

## Phase 0 — Foundation

Technical foundation và onboarding.

## Phase 1 — Private Universe MVP

Memory + Universe + Capsule.

## Phase 2 — Daily Connection

Daily Check-in + Same Moment + Realtime.

## Phase 3 — Living Universe

Quests + Constellations + Milestones + Universe progression.

## Phase 4 — Relationship Intelligence

AI Archivist + Monthly Story + Couple Wrapped.

---

# PHASE 0 — FOUNDATION

# Epic 0.1 — User Authentication

## User Story

As a user,  
I want to create an account and sign in securely,  
so that my relationship data remains private.

## Acceptance Criteria

### Sign Up

Given a new user  
When they provide a valid email and password  
Then an account must be created.

And:

- email must be unique
- password must satisfy minimum security requirements
- invalid input must show a readable error

### Sign In

Given an existing user  
When valid credentials are submitted  
Then the user is authenticated.

### Session

Given an authenticated user  
When they refresh the page  
Then the session remains active.

### Sign Out

When the user signs out  
Then authentication tokens must be invalidated on the client.

---

# Epic 0.2 — Create Couple

## User Story

As a user,  
I want to create a private relationship space,  
so that I can invite my partner into our universe.

## Acceptance Criteria

When creating a couple:

The user can provide:

- couple/universe name
- relationship start date
- optional nickname

System must:

- generate a unique couple ID
- set creator as first couple member
- create initial empty universe

Only maximum 2 active members are allowed per couple in MVP.

---

# Epic 0.3 — Invite Partner

## User Story

As a user,  
I want to invite my partner,  
so that we can share the same universe.

## Acceptance Criteria

The creator can generate an invitation.

Invitation must contain:

- unique invite token
- expiration time
- couple ID

When the invited partner accepts:

- they join the existing couple
- they must not create another universe
- universe becomes accessible to both

Expired invitation must not work.

A third user must not be able to join.

---

# Epic 0.4 — Couple Profile

## User Story

As a couple,  
we want basic relationship information stored,  
so that the universe can use it for milestones.

## Fields

- relationship start date
- couple name
- user display names
- avatar
- timezone
- optional next-meeting date

## Acceptance Criteria

Either partner can update allowed couple settings.

Updated information must synchronize for both users.

---

# PHASE 1 — PRIVATE UNIVERSE MVP

# Epic 1.1 — Universe Home

## User Story

As a user,  
I want to enter our universe immediately after opening the app,  
so that the product feels like a world rather than a dashboard.

## Acceptance Criteria

After login:

User lands on `/universe`.

Universe renders:

- central planet
- background stars
- existing memory stars
- camera controls

User can:

- rotate
- zoom
- click cosmic objects

Universe should render on:

- desktop
- tablet
- supported mobile browsers

Initial universe must load even when no memories exist.

Empty state:

> Your universe begins here.

---

# Epic 1.2 — Create Memory

## User Story

As a user,  
I want to save a meaningful moment,  
so that it becomes part of our universe.

## Memory Fields

Required:

- title
- date

Optional:

- description
- photo
- location text
- category
- importance

Categories:

- everyday
- date
- trip
- funny
- special
- difficult
- random

## Acceptance Criteria

When a valid memory is created:

- memory is saved
- relationship event is generated
- Universe Engine creates a cosmic object
- default cosmic object is a Star

New star must appear in the universe.

Both partners can view the memory.

---

# Epic 1.3 — Memory Star

## User Story

As a user,  
I want each memory to appear as a star,  
so that our history becomes visually explorable.

## Acceptance Criteria

Each memory star must have:

- unique position
- visual size
- brightness
- reference to memory

Clicking the star opens Memory Detail.

Important memories must visually differ from normal memories.

Star positions must remain consistent between sessions.

---

# Epic 1.4 — Memory Detail

## User Story

As a user,  
I want to click a star and see the story behind it.

## Acceptance Criteria

Memory Detail displays:

- title
- date
- description
- image
- author
- category

User can:

- close detail
- edit own memory
- delete own memory

Deletion must remove or archive the related cosmic object.

---

# Epic 1.5 — Photo Upload

## User Story

As a user,  
I want to attach photos to memories.

## Acceptance Criteria

Supported formats:

- JPEG
- PNG
- WebP
- HEIC if converted client-side

Before upload:

- image should be resized
- optimized version should be generated

Maximum configured upload size must be enforced.

The universe must use thumbnail versions.

Original high-resolution image must not be loaded in the 3D scene.

---

# Epic 1.6 — Secret Capsule

## User Story

As a user,  
I want to create a message that cannot be opened until a future moment.

## Capsule Fields

- title
- message
- optional image
- unlock date
- creator

## Acceptance Criteria

Before unlock date:

Partner can see:

- capsule object
- creator
- unlock date

Partner cannot see:

- message
- hidden image

When unlock time is reached:

capsule becomes openable.

Once opened:

- opened timestamp is stored
- capsule content remains accessible

---

# Epic 1.7 — Capsule Cosmic Object

## User Story

As a user,  
I want locked capsules to appear mysteriously within our universe.

## Acceptance Criteria

Locked capsule appears as:

- comet
or
- distant unidentified object

Locked object must visually differ from a normal memory.

Clicking before unlock displays:

> Locked until [date].

---

# Epic 1.8 — Relationship Age

## User Story

As a user,  
I want to know how long we have been together.

## Acceptance Criteria

System calculates relationship duration using relationship start date.

It may display:

- days together
- anniversary countdown

Calculation must respect configured timezone.

---

# PHASE 1 EXIT CRITERIA

Phase 1 is complete when:

- two users can join one universe
- users can create memories
- memories generate stars
- stars can be explored
- images work
- secret capsules work
- app functions reliably on mobile and desktop

At this stage, the product is usable by the two founders/users.

---

# PHASE 2 — DAILY CONNECTION

# Epic 2.1 — Daily Check-in

## User Story

As a user,  
I want to share how I feel today,  
so that my partner can understand my current state.

## Check-in Fields

- mood
- optional short note
- optional photo

Mood options:

- happy
- calm
- tired
- stressed
- sad
- excited
- need_space
- miss_you

## Acceptance Criteria

Each user can create maximum one active daily check-in per local day.

Check-in can be edited during the same day.

Partner can see today's check-in.

Historical check-ins are retained.

---

# Epic 2.2 — Emotional Weather

## User Story

As a user,  
I want our moods to subtly influence the planet.

## Acceptance Criteria

Planet atmosphere changes according to recent check-ins.

Examples:

Happy:

- warmer atmosphere
- more particles

Calm:

- clear sky

Sad:

- light rain/cloud effect

Stressed:

- faster cloud movement

Need space:

- quieter environment

Effects must remain subtle.

The feature must not label the relationship as good or bad.

---

# Epic 2.3 — Realtime Universe Update

## User Story

As a user,  
I want to see new activity from my partner without refreshing.

## Acceptance Criteria

If Partner A creates a memory while Partner B is online:

Partner B receives the event in realtime.

A new star appears without page refresh.

Realtime events include:

- memory created
- check-in updated
- capsule unlocked

Realtime failure must not prevent eventual consistency after reload.

---

# Epic 2.4 — Star Birth Animation

## User Story

As a user,  
I want new memories to visibly enter the universe.

## Acceptance Criteria

When a new memory is created:

A star birth animation is displayed.

Animation must:

- be short
- not block interaction
- respect reduced-motion preferences

---

# Epic 2.5 — Same Moment

## User Story

As a couple in different places,  
we want to capture what each of us is seeing at approximately the same moment.

## Flow

System creates a Same Moment event.

Both users receive a notification.

Each user can upload:

- one photo
- optional caption

Once both submissions exist:

A Same Moment pair is created.

---

## Acceptance Criteria

A Same Moment event contains:

- event timestamp
- response window
- Partner A submission
- Partner B submission

If both users submit:

Twin Star object is generated.

If only one submits:

event remains incomplete.

No user should see the other person's photo before submitting their own, if Blind Mode is enabled.

---

# Epic 2.6 — Twin Stars

## User Story

As a user,  
I want Same Moments to become visually unique objects.

## Acceptance Criteria

Completed Same Moment generates two linked stars.

Twin Stars should:

- orbit or visually connect
- open a shared Same Moment card

Card contains:

- both photos
- timestamp
- optional captions

---

# Epic 2.7 — Same Moment History

## User Story

As a user,  
I want to browse past Same Moments.

## Acceptance Criteria

Users can view previous Same Moments chronologically.

Each completed event shows both photos.

Incomplete events are visually identified.

---

# PHASE 2 EXIT CRITERIA

Phase 2 is complete when:

- daily interactions exist
- universe responds to mood
- realtime updates work
- Same Moment flow is functional
- Twin Stars appear
- users have reasons to return regularly

---

# PHASE 3 — LIVING UNIVERSE

# Epic 3.1 — Couple Quests

## User Story

As a couple,  
we want occasional shared activities,  
so that we can create moments together despite being apart.

## Example Quests

- photograph the sky
- share today's favorite song
- show what you're eating
- write one thing you want to do together
- recreate an old photo
- describe today's best moment

## Acceptance Criteria

System can publish a quest.

Quest has:

- title
- instructions
- expiry
- response type

Each partner submits independently.

Quest completes only when required submissions exist.

---

# Epic 3.2 — Quest Reward

## User Story

As a couple,  
we want completing quests to visibly grow our universe.

## Acceptance Criteria

Completed quest creates a cosmic reward.

Possible rewards:

- cosmic fragment
- small asteroid
- flower on planet
- nebula
- special star

Reward must persist.

---

# Epic 3.3 — Trips

## User Story

As a user,  
I want major trips to become planets.

## Acceptance Criteria

A Trip can contain:

- destination
- start/end dates
- memories
- photos

When marked as a significant trip:

Universe Engine creates a Planet.

Planet opens Trip Detail.

---

# Epic 3.4 — Anniversary Moon

## User Story

As a couple,  
we want anniversaries to be represented as milestones.

## Acceptance Criteria

System detects yearly relationship anniversaries.

A Moon is created for each completed anniversary.

Moon stores:

- anniversary number
- year
- associated memories

---

# Epic 3.5 — Milestones

## User Story

As a couple,  
we want meaningful milestones to permanently change our universe.

## Example Milestones

- 100 days
- 365 days
- first trip
- 100 memories
- 50 Same Moments
- custom milestone

## Acceptance Criteria

When conditions are met:

- milestone event is generated
- cosmic event may trigger
- milestone appears in history

---

# Epic 3.6 — Constellations

## User Story

As a user,  
I want related memories to form constellations.

## Acceptance Criteria

A constellation contains multiple memory stars.

Constellation may be created:

- manually
- automatically

Examples:

- Late Night Calls
- Hanoi Trip
- Food Adventures
- First Year

Visual lines connect member stars.

Clicking constellation opens collection detail.

---

# Epic 3.7 — Memory Gravity

## User Story

As a user,  
I want important memories to naturally become more prominent.

## Signals

Possible signals:

- manual importance
- repeated views
- reactions
- attached media
- linked memories
- milestone association

## Acceptance Criteria

Memory Gravity produces an importance score.

Importance may influence:

- brightness
- size
- orbit position

It must not modify original memory content.

---

# Epic 3.8 — Cosmic Events

## User Story

As a user,  
I want rare events to make milestones feel special.

## Examples

- meteor shower
- aurora
- comet
- supernova animation
- planet bloom

## Acceptance Criteria

Cosmic Events may be triggered by:

- anniversary
- relationship milestone
- rare achievement
- scheduled event

Event must be deterministic enough not to accidentally trigger repeatedly.

---

# Epic 3.9 — Future Dreams

## User Story

As a couple,  
we want to store things we hope to do together.

## Fields

- title
- description
- target date optional
- category
- status

## Status

- dream
- planned
- completed

## Acceptance Criteria

Dream appears as a distant cosmic object.

When marked completed:

it transitions into a permanent memory object.

---

# PHASE 3 EXIT CRITERIA

Phase 3 is complete when:

- universe noticeably evolves over time
- memories form structures
- milestones create visible changes
- quests give users shared activities
- trips become planets
- anniversaries become moons

The universe should now be unique for each couple.

---

# PHASE 4 — RELATIONSHIP INTELLIGENCE

# Epic 4.1 — AI Archivist

## User Story

As a user,  
I want the app to summarize our shared history,  
so that important patterns and moments are easier to rediscover.

## Product Rule

AI is not a relationship therapist.

AI should not:

- judge relationship quality
- diagnose users
- assign compatibility scores
- recommend breaking up
- analyze private behavior negatively

AI acts only as:

**Archivist + storyteller + curator.**

---

# Epic 4.2 — Monthly Cosmic Journal

## User Story

As a couple,  
we want a short recap of our month.

## Inputs

System may use:

- memories
- check-ins
- Same Moments
- trips
- quests
- milestones

## Acceptance Criteria

At month end system can create a recap containing:

- number of memories
- notable categories
- top moments
- newly created universe objects
- short narrative

Example:

> September was quieter, but the small moments stayed warm.

User can disable AI summaries.

---

# Epic 4.3 — AI Constellation Naming

## User Story

As a user,  
I want meaningful groups of memories to receive suggested names.

## Acceptance Criteria

Given a group of related memories:

AI may suggest constellation names.

Example:

Memories:

- late calls
- midnight screenshots
- sleepy selfies

Suggestion:

> Midnight Orbit

User must be able to:

- accept
- reject
- rename

---

# Epic 4.4 — Couple Wrapped

## User Story

As a couple,  
we want an annual recap of our relationship universe.

## Wrapped Sections

Possible cards:

- memories created
- Same Moments
- trips
- most active month
- most revisited memory
- new constellations
- universe growth
- milestones

Example:

```text
2027

284 memories
42 Twin Stars
3 planets
1 new moon
7 constellations
```

---

# Epic 4.5 — Visual Universe Evolution

## User Story

As a user,  
I want to see how our universe changed during the year.

## Acceptance Criteria

Yearly Wrapped includes:

Beginning-of-year universe snapshot.

End-of-year universe snapshot.

System may animate transition between them.

---

# Epic 4.6 — Relationship Timeline

## User Story

As a user,  
I want to travel through our relationship chronologically.

## Acceptance Criteria

Timeline can filter universe by date.

Example slider:

```text
2026 ─────────●──────── 2028
```

When moving slider:

only objects existing before selected date are shown.

Allows users to visually replay universe growth.

---

# PHASE 4 EXIT CRITERIA

Phase 4 is complete when:

- AI can summarize history safely
- monthly stories work
- constellation suggestions work
- yearly Wrapped works
- users can replay universe growth over time

---

# 8. Universe Engine

Universe Engine is a core domain component.

It converts relationship events into cosmic objects.

```text
Relationship Event
        ↓
Universe Engine
        ↓
Cosmic Object
```

Example:

```text
Memory
category = travel
importance = 9
photos = 32
duration = 4 days
```

Possible result:

```json
{
  "type": "planet",
  "size": 1.3,
  "brightness": 0.8,
  "orbit": 7.5
}
```

---

# 9. Relationship Event Schema

```text
id

couple_id

event_type

source_entity_id

actor_user_id

created_at

event_date

metadata
```

Possible event types:

```text
MEMORY_CREATED

MEMORY_IMPORTANT

CHECKIN_CREATED

SAME_MOMENT_COMPLETED

QUEST_COMPLETED

TRIP_CREATED

ANNIVERSARY_REACHED

MILESTONE_REACHED

CAPSULE_CREATED

CAPSULE_OPENED
```

---

# 10. Cosmic Object Schema

```text
id

couple_id

relationship_event_id

object_type

position_x
position_y
position_z

scale

brightness

rotation

visual_seed

metadata

created_at
```

Object types:

```text
STAR

BRIGHT_STAR

TWIN_STAR

PLANET

MOON

COMET

ASTEROID

CONSTELLATION

NEBULA

DISTANT_OBJECT
```

---

# 11. Suggested Database Structure

```text
users

couples

couple_members

couple_settings

memories

memory_media

daily_checkins

same_moment_events

same_moment_submissions

capsules

quests

quest_submissions

trips

milestones

future_dreams

relationship_events

cosmic_objects

constellations

constellation_members

monthly_summaries

yearly_wrapped
```

---

# 12. Privacy Requirements

Relationship data must be private by default.

Users from another couple must never be able to query:

- memories
- photos
- check-ins
- capsules
- cosmic objects

Database access must enforce couple membership.

Example:

```text
user
↓
couple_members
↓
couple_id
↓
resource authorization
```

Do not rely only on frontend access control.

---

# 13. Media Requirements

Images should be processed before upload.

Recommended versions:

```text
thumbnail
~400px

medium
~1200px

original
optional
```

Universe scene uses thumbnail only.

Full image loads only in detail view.

---

# 14. Performance Requirements

Initial universe target:

≤ 1,000 visible objects without major frame drops on modern desktop devices.

Mobile must use adaptive rendering.

Possible optimizations:

- InstancedMesh
- LOD
- texture compression
- lazy loading
- limited particle count
- object culling

Target:

Desktop:

60 FPS where reasonably possible.

Mobile:

30+ FPS acceptable.

---

# 15. Accessibility

Support:

- reduced motion
- keyboard navigation outside 3D scene
- readable memory detail
- accessible form labels

Animation-heavy events must respect:

```text
prefers-reduced-motion
```

---

# 16. Notifications

Potential notification types:

- partner created a capsule
- Same Moment started
- capsule unlocked
- anniversary
- quest available

Notifications should not include sensitive content directly.

Example:

Good:

> A capsule is ready to open.

Avoid:

> Minh wrote that they miss you because...

---

# 17. Analytics Events

Core product analytics:

```text
account_created

partner_invited

partner_joined

universe_opened

memory_created

memory_viewed

memory_revisited

capsule_created

capsule_opened

checkin_created

same_moment_started

same_moment_completed

quest_completed

constellation_opened

trip_created

wrapped_viewed
```

Important product metrics:

### Activation

User creates first memory.

### Couple Activation

Both partners have joined and interacted.

### Retention

Couple opens universe again after:

- Day 1
- Day 7
- Day 30

### Emotional Value Signal

Memory revisit rate.

```text
memory_viewed
where
age_of_memory > 30 days
```

This is more meaningful than simple session count.

---

# 18. MVP Success Metrics

For private beta:

Success is not MAU.

Success means couples voluntarily return.

Strong signals:

- users revisit old stars
- both partners contribute
- users create multiple Same Moments
- capsules are opened
- universe exploration lasts longer over time

Suggested metric:

```text
Percentage of couples
who revisit a memory older than 30 days
```

This validates the main product hypothesis:

> Turning relationship history into a world makes old memories worth exploring again.

---

# 19. Explicitly Out of Scope for MVP

Do not build initially:

- public profiles
- social feed
- strangers discovery
- direct messaging
- video calls
- voice calls
- native mobile app
- AI relationship advice
- compatibility scoring
- NFT/blockchain
- full VR
- multiplayer game world
- custom avatar system

These features add complexity without validating the core concept.

---

# 20. Recommended Development Order

## Sprint 1

Foundation:

- Next.js project
- auth
- couple
- invite
- DB schema

## Sprint 2

Universe shell:

- Three.js canvas
- planet
- camera
- persistent cosmic objects

## Sprint 3

Memory:

- create memory
- media upload
- memory star
- memory detail

## Sprint 4

Capsules:

- create
- lock
- unlock
- cosmic representation

At this point:

**Phase 1 MVP is usable.**

---

## Sprint 5

Daily check-ins.

## Sprint 6

Realtime universe updates.

## Sprint 7

Same Moment.

## Sprint 8

Twin Stars + history.

Phase 2 complete.

---

## Sprint 9+

Trips.

Quests.

Milestones.

Constellations.

Universe progression.

---

# 21. Suggested Technical Architecture

```text
                    Browser

              Next.js + TypeScript

          ┌────────────┴────────────┐
          │                         │

    React Three Fiber             UI
       Universe              Tailwind/Shadcn

          │                         │
          └────────────┬────────────┘

                       │

                   Supabase

        ┌──────────────┼──────────────┐

      Auth         PostgreSQL      Realtime

                       │

                 Cloudflare R2

                    Images
```

AI layer later:

```text
Relationship Events
        ↓
Aggregation Worker
        ↓
Structured Context
        ↓
LLM
        ↓
Monthly / Yearly Story
```

---

# 22. Recommended MVP Scope

For the first version actually shipped to the couple, implement only:

## Required

- authentication
- couple invitation
- universe
- memory
- memory stars
- photo
- memory detail
- secret capsule

## Very desirable

- daily check-in
- realtime star birth

## Post-MVP

- Same Moment
- quests
- trips
- constellations
- AI
- Wrapped

---

# 23. Product North Star

The product succeeds when users can open the app years later, zoom out, and recognize their relationship through the universe they created together.

The intended emotional reaction is not:

> “We logged 500 memories.”

It is:

> “That entire world exists because of us.”