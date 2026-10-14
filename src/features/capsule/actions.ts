"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCoupleId, requireUser } from "@/lib/auth";

export type CapsuleFormState = { error: string | null; capsuleId: string | null };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCapsule(formData: FormData): Promise<CapsuleFormState> {
  const title = field(formData, "title");
  const message = field(formData, "message");
  const unlockDate = field(formData, "unlock_date");
  if (!title || title.length > 120) {
    return { error: "Give this capsule a title of up to 120 characters.", capsuleId: null };
  }
  if (!message || message.length > 4000) {
    return { error: "Write a message of up to 4000 characters.", capsuleId: null };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(unlockDate)) {
    return { error: "Choose the day this capsule can be opened.", capsuleId: null };
  }

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("create_capsule", {
    p_couple_id: coupleId,
    p_title: title,
    p_message: message,
    p_unlock_date: unlockDate,
  });
  if (error || typeof data !== "string") {
    console.error("create_capsule failed:", error?.message ?? "unexpected rpc result");
    const lockedDate = error?.message.includes("invalid_capsule");
    return {
      error: lockedDate
        ? "Choose an unlock day in the future, within the next 50 years."
        : "Could not seal this capsule. Please try again.",
      capsuleId: null,
    };
  }
  revalidatePath("/universe");
  return { error: null, capsuleId: data };
}

export async function openCapsule(capsuleId: string): Promise<{ error: string | null }> {
  if (!UUID_PATTERN.test(capsuleId)) return { error: "This capsule could not be found." };
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const { error } = await supabase.rpc("open_capsule", { p_capsule_id: capsuleId });
  if (error) {
    console.error("open_capsule failed:", error.message);
    return {
      error: error.message.includes("capsule_locked")
        ? "This capsule is still locked."
        : "Could not open this capsule.",
    };
  }
  revalidatePath("/universe");
  return { error: null };
}

export async function deleteCapsule(capsuleId: string): Promise<{ error: string | null }> {
  if (!UUID_PATTERN.test(capsuleId)) return { error: "This capsule could not be found." };
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const { data, error } = await supabase.rpc("delete_capsule", { p_capsule_id: capsuleId });
  if (error) {
    console.error("delete_capsule failed:", error.message);
    return { error: "Only a sealed capsule can be removed by its creator." };
  }
  if (Array.isArray(data) && data.length > 0) {
    await supabase.storage.from("universe-media").remove(data.filter((path) => typeof path === "string"));
  }
  revalidatePath("/universe");
  return { error: null };
}
