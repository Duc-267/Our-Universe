import { AppHeader } from "@/components/app-header";
import { UniverseView, type UniverseMemory } from "@/components/universe-view";
import type { RelationshipAge } from "@/features/couple/age";

const CATEGORIES = ["everyday", "date", "trip", "funny", "special", "difficult", "random"];
const ICONS = ["heart", "star", "coffee", "camera", "music", "moon", "flower", "plane"];
const TITLES = [
  "First video call", "Hanoi rain walk", "Seoul tower night", "Midnight ramen", "Our first trip",
  "The long goodbye", "Sunday pancakes", "Han river picnic", "Lost in Itaewon", "Pho at 2am",
  "Matching scarves", "Airport hug",
];

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function orbit(i: number, count: number, salt = 0) {
  const angle = (i / count) * Math.PI * 2 + salt;
  const radius = 48 + seeded(i, salt + 1) * 30;
  return {
    positionX: Math.cos(angle) * radius,
    positionY: (seeded(i, salt + 2) - 0.5) * 36,
    positionZ: Math.sin(angle) * radius,
  };
}

const memories: UniverseMemory[] = TITLES.map((title, i) => ({
  id: `m${i}`,
  title,
  memoryDate: `2026-${String((i % 9) + 1).padStart(2, "0")}-1${i % 9}`,
  description: "A small moment we wanted to keep.",
  locationText: null,
  category: CATEGORIES[i % CATEGORIES.length],
  importance: i % 4 === 0 ? 9 : 5,
  icon: ICONS[i % ICONS.length],
  photos: [],
  authorName: i % 2 ? "Minh" : "Ji-woo",
  isAuthor: i % 2 === 0,
  star: {
    type: i % 4 === 0 ? "BRIGHT_STAR" : "STAR",
    ...orbit(i, TITLES.length),
    scale: i % 4 === 0 ? 1.35 : 1,
    brightness: 0.6,
    gravity: 30 + (i % 5) * 10,
    rotation: seeded(i, 9),
    visualSeed: i,
  },
}));

export default async function PreviewWorld({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string; ready?: string }>;
}) {
  const { empty, ready } = await searchParams;
  const isEmpty = empty === "1";
  return (
    <main className="universe-page">
      <AppHeader coupleName="Minh & Ji-woo" />
      <UniverseView
        coupleId="00000000-0000-0000-0000-000000000000"
        userId="u1"
        memories={isEmpty ? [] : memories}
        capsules={isEmpty ? [] : [{
          id: "c1",
          creatorName: "Ji-woo",
          isCreator: false,
          unlockDate: "2026-11-20",
          openedAt: null,
          canOpen: ready === "1",
          title: null,
          message: null,
          image: null,
          comet: { ...orbit(1, 3, 2.2), scale: 1, rotation: 0.4, visualSeed: 3 },
        }]}
        moments={[]}
        milestones={isEmpty ? [] : [{
          id: "ms1",
          kind: "anniversary",
          key: "1",
          reachedOn: "2026-03-14",
          title: "First anniversary",
          moon: { ...orbit(0, 2, 1.1), scale: 1.4, rotation: 0, visualSeed: 1 },
        }]}
        quests={[]}
        trips={isEmpty ? [] : [{
          id: "t1",
          destination: "Busan",
          startDate: "2026-07-01",
          endDate: "2026-07-05",
          note: null,
          significant: true,
          createdByName: "Minh",
          memories: [],
          planet: { ...orbit(2, 3, 0.6), scale: 1.4, rotation: 0.3, visualSeed: 2 },
        }]}
        dreams={isEmpty ? [] : [{
          id: "d1",
          title: "See the aurora",
          description: null,
          targetDate: null,
          category: "trip",
          status: "dream",
          createdByName: "Ji-woo",
          memoryId: null,
          distant: { positionX: 120, positionY: 30, positionZ: -60, scale: 1, rotation: 0, visualSeed: 5 },
        }]}
        constellations={isEmpty ? [] : [{
          id: "k1",
          name: "Seoul nights",
          note: null,
          createdByName: "Minh",
          memories: [memories[2], memories[3], memories[8]].map((memory) => ({
            id: memory.id,
            title: memory.title,
            memoryDate: memory.memoryDate,
            thumbUrl: null,
          })),
        }]}
        cosmicEvents={[]}
        skyEvent={null}
        age={{
          daysTogether: 612,
          yearsTogether: 1,
          nextAnniversary: { number: 2, date: "2027-03-14", daysAway: 109 },
        } satisfies RelationshipAge}
        canInvite={isEmpty}
        initialSelectedId={null}
        initialCapsuleId={null}
        initialMomentId={null}
        initialMoonId={null}
        initialQuestId={null}
        initialTripId={null}
        initialDreamId={null}
        initialConstellationId={null}
        today="2026-11-25"
        checkins={[]}
        sky={{ tints: ["quiet"], poses: ["look"] }}
      />
    </main>
  );
}
