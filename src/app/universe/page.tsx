import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { UniverseView, type UniverseMemory } from "@/components/universe-view";
import { todayInZone, computeRelationshipAge } from "@/features/couple/age";
import { skyFromMoods } from "@/features/checkin/weather";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function UniversePage({
  searchParams,
}: {
  searchParams: Promise<{ star?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, settings, members, memories, objects, checkins] = await Promise.all([
    supabase
      .from("couples")
      .select("name, created_by, relationship_start_date")
      .eq("id", coupleId)
      .single(),
    supabase.from("couple_settings").select("timezone").eq("couple_id", coupleId).single(),
    supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
    supabase
      .from("memories")
      .select(
        "id, title, memory_date, description, location_text, category, importance, icon, author_user_id",
      )
      .eq("couple_id", coupleId)
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("cosmic_objects")
      .select(
        "memory_id, object_type, position_x, position_y, position_z, scale, brightness, rotation, visual_seed",
      )
      .eq("couple_id", coupleId)
      .in("object_type", ["STAR", "BRIGHT_STAR"]),
    supabase
      .from("daily_checkins")
      .select("id, author_user_id, local_date, mood, note, updated_at")
      .eq("couple_id", coupleId)
      .order("local_date", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);
  if (
    couple.error ||
    settings.error ||
    members.error ||
    memories.error ||
    objects.error ||
    checkins.error
  ) {
    throw new Error("Could not load your universe.");
  }

  const memberIds = members.data.map((member) => member.user_id);
  const profiles = await supabase.from("profiles").select("id, display_name").in("id", memberIds);
  if (profiles.error) throw new Error("Could not load members.");

  const nameByUser = new Map(profiles.data.map((profile) => [profile.id, profile.display_name]));
  const starByMemory = new Map(objects.data.map((object) => [object.memory_id, object]));

  const universeMemories: UniverseMemory[] = memories.data.map((memory) => {
    const star = starByMemory.get(memory.id);
    return {
      id: memory.id,
      title: memory.title,
      memoryDate: memory.memory_date,
      description: memory.description,
      locationText: memory.location_text,
      category: memory.category,
      importance: memory.importance,
      icon: memory.icon,
      authorName:
        nameByUser.get(memory.author_user_id) ||
        (memory.author_user_id === userId ? "You" : "Your partner"),
      isAuthor: memory.author_user_id === userId,
      star: star
        ? {
            type: star.object_type as "STAR" | "BRIGHT_STAR",
            positionX: star.position_x,
            positionY: star.position_y,
            positionZ: star.position_z,
            scale: star.scale,
            brightness: star.brightness,
            rotation: star.rotation,
            visualSeed: star.visual_seed,
          }
        : null,
    };
  });

  const today = todayInZone(settings.data.timezone);
  const todaysMoods = checkins.data
    .filter((row) => row.local_date === today)
    .map((row) => row.mood);
  const age = computeRelationshipAge(couple.data.relationship_start_date, settings.data.timezone);
  const canInvite = couple.data.created_by === userId && members.data.length < 2;
  const { star } = await searchParams;

  return (
    <main className="universe-page">
      <AppHeader coupleName={couple.data.name} />
      <UniverseView
        coupleId={coupleId}
        memories={universeMemories}
        age={age}
        canInvite={canInvite}
        initialSelectedId={star ?? null}
        today={today}
        sky={skyFromMoods(todaysMoods)}
        checkins={checkins.data.map((row) => ({
          id: row.id,
          authorUserId: row.author_user_id,
          authorName:
            nameByUser.get(row.author_user_id) ||
            (row.author_user_id === userId ? "You" : "Your partner"),
          localDate: row.local_date,
          mood: row.mood,
          note: row.note,
          isMine: row.author_user_id === userId,
        }))}
      />
    </main>
  );
}
