import type { SupabaseClient } from "@supabase/supabase-js";
import type { PreparedPhoto } from "./prepare";

function paths(base: string, extension: PreparedPhoto["extension"]) {
  return { fullPath: `${base}full.${extension}`, thumbPath: `${base}thumb.${extension}` };
}

async function uploadPair(supabase: SupabaseClient, base: string, photo: PreparedPhoto) {
  const contentType = photo.extension === "webp" ? "image/webp" : "image/jpeg";
  const stored = paths(base, photo.extension);
  const bucket = supabase.storage.from("universe-media");
  const full = await bucket.upload(stored.fullPath, photo.full, { contentType, upsert: false });
  if (full.error) throw new Error("Could not upload this photo.");
  const thumb = await bucket.upload(stored.thumbPath, photo.thumb, { contentType, upsert: false });
  if (thumb.error) {
    await bucket.remove([stored.fullPath]);
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
