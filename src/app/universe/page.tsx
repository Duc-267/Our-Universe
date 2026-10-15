import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { UniverseView, type UniverseCapsule, type UniverseMemory } from "@/components/universe-view";
import type { UniverseMilestone } from "@/components/milestones-panel";
import type { QuestRow } from "@/components/quest-panel";
import type { SameMomentRow } from "@/components/same-moment-panel";
import { todayInZone, computeRelationshipAge } from "@/features/couple/age";
import { skyFromMoods } from "@/features/checkin/weather";
import type { QuestResponseType, QuestRewardKind } from "@/features/quest/catalog";
import { signedUrlMap } from "@/features/media/urls";
import { currentCoupleId, requireUser } from "@/lib/auth";

function ordinal(value: string): string {
  const number = Number(value);
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

function milestoneTitle(kind: string, key: string): string {
  if (kind === "anniversary") return `${ordinal(key)} anniversary`;
  return `${key} days together`;
}

export default async function UniversePage({
  searchParams,
}: {
  searchParams: Promise<{ star?: string; capsule?: string; moment?: string; moon?: string; quest?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  await supabase.rpc("refresh_same_moments");
  await supabase.rpc("refresh_milestones");
  await supabase.rpc("refresh_quests");

  const [couple, settings, members, memories, photos, objects, capsules, contents, checkins, moments, submissions, milestones, quests, questSubmissions] =
    await Promise.all([
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
          "memory_id, capsule_id, same_moment_id, milestone_id, quest_id, twin_slot, object_type, position_x, position_y, position_z, scale, brightness, rotation, visual_seed",
        )
        .eq("couple_id", coupleId)
        .in("object_type", ["STAR", "BRIGHT_STAR", "COMET", "TWIN_STAR", "MOON", "QUEST_REWARD"]),
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
        .select(
          "id, author_user_id, local_date, mood, note, updated_at, image_thumb_path, image_full_path",
        )
        .eq("couple_id", coupleId)
        .order("local_date", { ascending: false })
        .order("updated_at", { ascending: false }),
      supabase
        .from("same_moments")
        .select("id, created_by, blind, status, window_ends_at, created_at, completed_at")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false }),
      supabase
        .from("same_moment_submissions")
        .select(
          "same_moment_id, author_user_id, caption, image_thumb_path, image_full_path, created_at",
        )
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: true }),
      supabase
        .from("milestones")
        .select("id, kind, key, reached_on")
        .eq("couple_id", coupleId)
        .order("reached_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("quests")
        .select(
          "id, title, instructions, response_type, reward_kind, status, created_at, expires_at, completed_at, created_by",
        )
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false }),
      supabase
        .from("quest_submissions")
        .select(
          "quest_id, author_user_id, body, image_thumb_path, image_full_path, created_at",
        )
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: true }),
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
    checkins.error ||
    moments.error ||
    submissions.error ||
    milestones.error ||
    quests.error ||
    questSubmissions.error
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
  const twinsByMoment = new Map<string, NonNullable<SameMomentRow["twins"]>>();
  for (const object of objects.data) {
    if (!object.same_moment_id || object.twin_slot == null) continue;
    const list = twinsByMoment.get(object.same_moment_id) ?? [];
    list.push({
      positionX: object.position_x,
      positionY: object.position_y,
      positionZ: object.position_z,
      scale: object.scale,
      rotation: object.rotation,
      visualSeed: object.visual_seed,
      slot: object.twin_slot,
    });
    twinsByMoment.set(object.same_moment_id, list);
  }
  const moonByMilestone = new Map(
    objects.data
      .filter((object) => object.object_type === "MOON" && object.milestone_id)
      .map((object) => [
        object.milestone_id as string,
        {
          positionX: object.position_x,
          positionY: object.position_y,
          positionZ: object.position_z,
          scale: object.scale,
          rotation: object.rotation,
          visualSeed: object.visual_seed,
        },
      ]),
  );
  const contentByCapsule = new Map(contents.data.map((content) => [content.capsule_id, content]));
  const rewardByQuest = new Map(
    objects.data
      .filter((object) => object.object_type === "QUEST_REWARD" && object.quest_id)
      .map((object) => [
        object.quest_id as string,
        {
          positionX: object.position_x,
          positionY: object.position_y,
          positionZ: object.position_z,
          scale: object.scale,
          rotation: object.rotation,
          visualSeed: object.visual_seed,
        },
      ]),
  );

  const thumbs = await signedUrlMap(supabase, [
    ...photos.data.map((photo) => photo.thumb_path),
    ...contents.data.flatMap((content) => (content.image_thumb_path ? [content.image_thumb_path] : [])),
    ...checkins.data.flatMap((row) => (row.image_thumb_path ? [row.image_thumb_path] : [])),
    ...submissions.data.flatMap((row) => (row.image_thumb_path ? [row.image_thumb_path] : [])),
    ...questSubmissions.data.flatMap((row) => (row.image_thumb_path ? [row.image_thumb_path] : [])),
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

  const submissionsByMoment = new Map<string, typeof submissions.data>();
  for (const submission of submissions.data) {
    const list = submissionsByMoment.get(submission.same_moment_id) ?? [];
    list.push(submission);
    submissionsByMoment.set(submission.same_moment_id, list);
  }

  const universeMoments: SameMomentRow[] = moments.data.map((moment) => {
    const rows = submissionsByMoment.get(moment.id) ?? [];
    return {
      id: moment.id,
      status: moment.status as SameMomentRow["status"],
      blind: moment.blind,
      createdAt: moment.created_at,
      windowEndsAt: moment.window_ends_at,
      completedAt: moment.completed_at,
      createdByName:
        nameByUser.get(moment.created_by) ||
        (moment.created_by === userId ? "You" : "Your partner"),
      mineSubmitted: rows.some((row) => row.author_user_id === userId),
      submissions: rows.map((row) => ({
        authorUserId: row.author_user_id,
        authorName:
          nameByUser.get(row.author_user_id) ||
          (row.author_user_id === userId ? "You" : "Your partner"),
        isMine: row.author_user_id === userId,
        caption: row.caption,
        thumbUrl: row.image_thumb_path ? thumbs.get(row.image_thumb_path) ?? null : null,
        fullPath: row.image_full_path,
      })),
      twins: twinsByMoment.get(moment.id) ?? [],
    };
  });

  const universeMilestones: UniverseMilestone[] = milestones.data.map((row) => ({
    id: row.id,
    kind: row.kind as UniverseMilestone["kind"],
    key: row.key,
    reachedOn: row.reached_on,
    title: milestoneTitle(row.kind, row.key),
    moon: moonByMilestone.get(row.id) ?? null,
  }));

  const submissionsByQuest = new Map<string, typeof questSubmissions.data>();
  for (const submission of questSubmissions.data) {
    const list = submissionsByQuest.get(submission.quest_id) ?? [];
    list.push(submission);
    submissionsByQuest.set(submission.quest_id, list);
  }

  const universeQuests: QuestRow[] = quests.data.map((quest) => {
    const rows = submissionsByQuest.get(quest.id) ?? [];
    return {
      id: quest.id,
      title: quest.title,
      instructions: quest.instructions,
      responseType: quest.response_type as QuestResponseType,
      rewardKind: quest.reward_kind as QuestRewardKind,
      status: quest.status as QuestRow["status"],
      createdAt: quest.created_at,
      expiresAt: quest.expires_at,
      completedAt: quest.completed_at,
      createdByName:
        nameByUser.get(quest.created_by) ||
        (quest.created_by === userId ? "You" : "Your partner"),
      mineSubmitted: rows.some((row) => row.author_user_id === userId),
      submissions: rows.map((row) => ({
        authorUserId: row.author_user_id,
        authorName:
          nameByUser.get(row.author_user_id) ||
          (row.author_user_id === userId ? "You" : "Your partner"),
        isMine: row.author_user_id === userId,
        body: row.body,
        thumbUrl: row.image_thumb_path ? thumbs.get(row.image_thumb_path) ?? null : null,
        fullPath: row.image_full_path,
      })),
      reward: rewardByQuest.get(quest.id) ?? null,
    };
  });

  const today = todayInZone(settings.data.timezone);
  const todaysMoods = checkins.data
    .filter((row) => row.local_date === today)
    .map((row) => row.mood);
  const age = computeRelationshipAge(couple.data.relationship_start_date, settings.data.timezone);
  const canInvite = couple.data.created_by === userId && members.data.length < 2;
  const { star, capsule, moment, moon, quest } = await searchParams;

  return (
    <main className="universe-page">
      <AppHeader coupleName={couple.data.name} />
      <UniverseView
        coupleId={coupleId}
        userId={userId}
        memories={universeMemories}
        capsules={universeCapsules}
        moments={universeMoments}
        milestones={universeMilestones}
        quests={universeQuests}
        age={age}
        canInvite={canInvite}
        initialSelectedId={star ?? null}
        initialCapsuleId={capsule ?? null}
        initialMomentId={moment ?? null}
        initialMoonId={moon ?? null}
        initialQuestId={quest ?? null}
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
          thumbUrl: row.image_thumb_path ? thumbs.get(row.image_thumb_path) ?? null : null,
          fullPath: row.image_full_path,
        }))}
      />
    </main>
  );
}
