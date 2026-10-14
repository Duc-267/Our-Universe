import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { UniverseView, type UniverseCapsule, type UniverseMemory } from "@/components/universe-view";
import { todayInZone, computeRelationshipAge } from "@/features/couple/age";
import { skyFromMoods } from "@/features/checkin/weather";
import { signedUrlMap } from "@/features/media/urls";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function UniversePage({
  searchParams,
}: {
  searchParams: Promise<{ star?: string; capsule?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, settings, members, memories, photos, objects, capsules, contents, checkins] = await Promise.all([
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
      .from("memory_photos")
      .select("id, memory_id, thumb_path, full_path, created_at")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: true }),
    supabase
      .from("cosmic_objects")
      .select(
        "memory_id, capsule_id, object_type, position_x, position_y, position_z, scale, brightness, rotation, visual_seed",
      )
      .eq("couple_id", coupleId)
      .in("object_type", ["STAR", "BRIGHT_STAR", "COMET"]),
    supabase
      .from("capsules")
      .select("id, creator_user_id, unlock_date, unlock_at, opened_at, created_at")
      .eq("couple_id", coupleId)
      .order("unlock_at", { ascending: true }),
    supabase
      .from("capsule_contents")
      .select("capsule_id, title, message, image_thumb_path, image_full_path")
      .eq("couple_id", coupleId),
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
    photos.error ||
    objects.error ||
    capsules.error ||
    contents.error ||
    checkins.error
  ) {
    throw new Error("Could not load your universe.");
  }

  const memberIds = members.data.map((member) => member.user_id);
  const profiles = await supabase.from("profiles").select("id, display_name").in("id", memberIds);
  if (profiles.error) throw new Error("Could not load members.");

  const nameByUser = new Map(profiles.data.map((profile) => [profile.id, profile.display_name]));
  const stars = objects.data.filter((object) => object.memory_id);
  const starByMemory = new Map(stars.map((object) => [object.memory_id, object]));
  const cometByCapsule = new Map(
    objects.data.filter((object) => object.capsule_id).map((object) => [object.capsule_id, object]),
  );
  const contentByCapsule = new Map(contents.data.map((content) => [content.capsule_id, content]));
  const thumbs = await signedUrlMap(supabase, [
    ...photos.data.map((photo) => photo.thumb_path),
    ...contents.data.flatMap((content) => (content.image_thumb_path ? [content.image_thumb_path] : [])),
  ]);
  const photosByMemory = new Map<string, UniverseMemory["photos"]>();
  for (const photo of photos.data) {
    const list = photosByMemory.get(photo.memory_id) ?? [];
    list.push({
      id: photo.id,
      thumbUrl: thumbs.get(photo.thumb_path) ?? "",
      fullPath: photo.full_path,
    });
    photosByMemory.set(photo.memory_id, list);
  }

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
      photos: photosByMemory.get(memory.id) ?? [],
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

  // Unlock state is part of this server render, and the database enforces it again on open.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const universeCapsules: UniverseCapsule[] = capsules.data.map((capsule) => {
    const content = contentByCapsule.get(capsule.id);
    const comet = cometByCapsule.get(capsule.id);
    const opened = Boolean(capsule.opened_at);
    return {
      id: capsule.id,
      creatorName:
        nameByUser.get(capsule.creator_user_id) ||
        (capsule.creator_user_id === userId ? "You" : "Your partner"),
      isCreator: capsule.creator_user_id === userId,
      unlockDate: capsule.unlock_date,
      openedAt: capsule.opened_at,
      canOpen: !opened && Date.parse(capsule.unlock_at) <= now,
      title: content?.title ?? null,
      message: content?.message ?? null,
      image: content?.image_full_path
        ? {
            thumbUrl: thumbs.get(content.image_thumb_path ?? "") ?? "",
            fullPath: content.image_full_path,
          }
        : null,
      comet: comet
        ? {
            positionX: comet.position_x,
            positionY: comet.position_y,
            positionZ: comet.position_z,
            scale: comet.scale,
            rotation: comet.rotation,
            visualSeed: comet.visual_seed,
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
  const { star, capsule } = await searchParams;

  return (
    <main className="universe-page">
      <AppHeader coupleName={couple.data.name} />
      <UniverseView
        coupleId={coupleId}
        memories={universeMemories}
        capsules={universeCapsules}
        age={age}
        canInvite={canInvite}
        initialSelectedId={star ?? null}
        initialCapsuleId={capsule ?? null}
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
