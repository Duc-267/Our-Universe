"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCoupleId, requireUser } from "@/lib/auth";

export type ConstellationFormState = { error: string | null; constellationId: string | null };

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function memoryIdsFromForm(formData: FormData): string[] {
  return formData.getAll("memory_ids").filter((value): value is string => typeof value === "string" && value.length > 0);
}

export async function createConstellation(formData: FormData): Promise<ConstellationFormState> {
  const name = field(formData, "name");
  const note = field(formData, "note");
  const memoryIds = memoryIdsFromForm(formData);

  if (!name || name.length > 80) {
    return { error: "Give this constellation a name of up to 80 characters.", constellationId: null };
  }
  if (note.length > 500) {
    return { error: "Keep the note to 500 characters.", constellationId: null };
  }
  if (memoryIds.length < 2) {
    return { error: "Link at least two memories.", constellationId: null };
  }

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("create_constellation", {
    p_name: name,
    p_note: note || null,
    p_memory_ids: memoryIds,
  });
  if (error || typeof data !== "string") {
    console.error("create_constellation failed:", error?.message ?? "unexpected rpc result");
    return { error: "Could not save this constellation.", constellationId: null };
  }

  revalidatePath("/universe");
  redirect(`/universe?constellation=${data}`);
}

export async function updateConstellation(
  constellationId: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const name = field(formData, "name");
  const note = field(formData, "note");
  const memoryIds = memoryIdsFromForm(formData);

  if (!name || name.length > 80) return { error: "Give this constellation a name of up to 80 characters." };
  if (note.length > 500) return { error: "Keep the note to 500 characters." };
  if (memoryIds.length < 2) return { error: "Keep at least two memories linked." };

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { error } = await supabase.rpc("update_constellation", {
    p_constellation_id: constellationId,
    p_name: name,
    p_note: note || null,
    p_memory_ids: memoryIds,
  });
  if (error) return { error: "Could not update this constellation." };
  revalidatePath("/universe");
  return { error: null };
}

export async function deleteConstellation(constellationId: string): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const { error } = await supabase.rpc("delete_constellation", { p_constellation_id: constellationId });
  if (error) return { error: "Could not delete this constellation." };
  revalidatePath("/universe");
  return { error: null };
}
