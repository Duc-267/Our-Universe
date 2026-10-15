import type { SupabaseClient } from "@supabase/supabase-js";
import type { PreparedPhoto } from "./prepare";

function paths(base: string, extension: PreparedPhoto["extension"]) {
  return { fullPath: `${base}full.${extension}`, thumbPath: `${base}thumb.${extension}` };
}

async function uploadPair(
  supabase: SupabaseClient,
  base: string,
  photo: PreparedPhoto,
  upsert = false,
) {
  const contentType = photo.extension === "webp" ? "image/webp" : "image/jpeg";
  const stored = paths(base, photo.extension);
  const bucket = supabase.storage.from("universe-media");
  const full = await bucket.upload(stored.fullPath, photo.full, { contentType, upsert });
  if (full.error) throw new Error("Could not upload this photo.");
  const thumb = await bucket.upload(stored.thumbPath, photo.thumb, { contentType, upsert });
  if (thumb.error) {
    if (!upsert) await bucket.remove([stored.fullPath]);
    throw new Error("Could not upload this photo.");
  }
  return stored;
}

export async function uploadMemoryPhoto(
  supabase: SupabaseClient,
  coupleId: string,
  memoryId: string,
  photo: PreparedPhoto,
) {
  const photoId = crypto.randomUUID();
  const base = `${coupleId.toLowerCase()}/memories/${memoryId.toLowerCase()}/${photoId.toLowerCase()}/`;
  const stored = await uploadPair(supabase, base, photo);
  const { error } = await supabase.rpc("add_memory_photo", {
    p_memory_id: memoryId,
    p_photo_id: photoId,
    p_extension: photo.extension,
    p_width: photo.width,
    p_height: photo.height,
  });
  if (error) {
    await supabase.storage.from("universe-media").remove([stored.fullPath, stored.thumbPath]);
    if (error.message.includes("photo_limit_reached")) {
      throw new Error("A memory can hold up to 6 photos.");
    }
    throw new Error("Could not attach this photo.");
  }
}

export async function uploadCheckinPhoto(
  supabase: SupabaseClient,
  coupleId: string,
  checkinId: string,
  photo: PreparedPhoto,
) {
  const base = `${coupleId.toLowerCase()}/checkins/${checkinId.toLowerCase()}/`;
  // Replacing today's photo reuses the same object path, so upsert is required.
  const stored = await uploadPair(supabase, base, photo, true);
  const { data, error } = await supabase.rpc("attach_checkin_photo", {
    p_checkin_id: checkinId,
    p_extension: photo.extension,
    p_width: photo.width,
    p_height: photo.height,
  });
  if (error) {
    await supabase.storage.from("universe-media").remove([stored.fullPath, stored.thumbPath]);
    throw new Error("Could not attach this photo.");
  }
  const previous = Array.isArray(data) ? data.filter((path) => typeof path === "string" && path !== stored.fullPath && path !== stored.thumbPath) : [];
  if (previous.length > 0) await supabase.storage.from("universe-media").remove(previous);
}

export async function uploadSameMoment(
  supabase: SupabaseClient,
  coupleId: string,
  momentId: string,
  userId: string,
  photo: PreparedPhoto,
  caption: string,
) {
  const base = `${coupleId.toLowerCase()}/moments/${momentId.toLowerCase()}/${userId.toLowerCase()}/`;
  const stored = await uploadPair(supabase, base, photo);
  const { error } = await supabase.rpc("submit_same_moment", {
    p_moment_id: momentId,
    p_extension: photo.extension,
    p_width: photo.width,
    p_height: photo.height,
    p_caption: caption || null,
  });
  if (error) {
    await supabase.storage.from("universe-media").remove([stored.fullPath, stored.thumbPath]);
    if (error.message.includes("already_submitted")) throw new Error("You already shared this moment.");
    if (error.message.includes("same_moment_closed")) throw new Error("This Same Moment has closed.");
    throw new Error("Could not share this moment.");
  }
}

export async function submitQuestResponse(
  supabase: SupabaseClient,
  coupleId: string,
  questId: string,
  userId: string,
  body: string | null,
  photo: PreparedPhoto | null,
) {
  let stored: { fullPath: string; thumbPath: string } | null = null;
  if (photo) {
    const base = `${coupleId.toLowerCase()}/quests/${questId.toLowerCase()}/${userId.toLowerCase()}/`;
    stored = await uploadPair(supabase, base, photo);
  }
  const { error } = await supabase.rpc("submit_quest", {
    p_quest_id: questId,
    p_body: body,
    p_extension: photo?.extension ?? null,
    p_width: photo?.width ?? null,
    p_height: photo?.height ?? null,
  });
  if (error) {
    if (stored) await supabase.storage.from("universe-media").remove([stored.fullPath, stored.thumbPath]);
    if (error.message.includes("already_submitted")) throw new Error("You already answered this quest.");
    if (error.message.includes("quest_closed")) throw new Error("This quest has closed.");
    if (error.message.includes("invalid_response")) throw new Error("Add the text this quest asks for.");
    if (error.message.includes("invalid_photo") || error.message.includes("photo_files_missing")) {
      throw new Error("Add a photo for this quest.");
    }
    throw new Error("Could not submit this quest.");
  }
}

export async function uploadCapsuleImage(
  supabase: SupabaseClient,
  coupleId: string,
  capsuleId: string,
  photo: PreparedPhoto,
) {
  const base = `${coupleId.toLowerCase()}/capsules/${capsuleId.toLowerCase()}/`;
  const stored = await uploadPair(supabase, base, photo);
  const { error } = await supabase.rpc("attach_capsule_image", {
    p_capsule_id: capsuleId,
    p_extension: photo.extension,
    p_width: photo.width,
    p_height: photo.height,
  });
  if (error) {
    await supabase.storage.from("universe-media").remove([stored.fullPath, stored.thumbPath]);
    throw new Error("Could not attach this photo.");
  }
}
