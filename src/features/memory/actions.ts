"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentCoupleId, requireUser } from "@/lib/auth";

export const MEMORY_CATEGORIES = [
  "everyday",
  "date",
  "trip",
  "funny",
  "special",
  "difficult",
  "random",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type MemoryFormState = { error: string | null };
export type DeleteMemoryState = { ok: boolean; error: string | null };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

type ParsedMemory = {
  title: string;
  memoryDate: string;
  description: string | null;
  locationText: string | null;
  category: string;
  importance: number;
};

function parseMemory(formData: FormData): { values?: ParsedMemory; error?: string } {
  const title = field(formData, "title");
  const memoryDate = field(formData, "memory_date");
  const description = field(formData, "description");
  const locationText = field(formData, "location_text");
  const category = field(formData, "category");
  const importance = Number(field(formData, "importance"));

  if (!title || title.length > 120) {
    return { error: "Give this memory a title of up to 120 characters." };
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(memoryDate) ||
    Number.isNaN(Date.parse(`${memoryDate}T00:00:00Z`)) ||
    new Date(`${memoryDate}T00:00:00Z`).toISOString().slice(0, 10) !== memoryDate
  ) {
    return { error: "Pick a valid calendar date for this memory." };
  }
  if (description.length > 2000) {
    return { error: "Descriptions are limited to 2000 characters." };
  }
  if (locationText.length > 120) {
    return { error: "Location text is limited to 120 characters." };
  }
  if (!(MEMORY_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Choose one of the memory categories." };
  }
  if (!Number.isInteger(importance) || importance < 1 || importance > 10) {
    return { error: "Importance must be between 1 and 10." };
  }
  return {
    values: {
      title,
      memoryDate,
      description: description || null,
      locationText: locationText || null,
      category,
      importance,
    },
  };
}

export async function createMemory(
  _previous: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const parsed = parseMemory(formData);
  if (parsed.error || !parsed.values) {
    return { error: parsed.error ?? "Could not save this memory." };
  }
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("create_memory", {
    p_couple_id: coupleId,
    p_title: parsed.values.title,
    p_memory_date: parsed.values.memoryDate,
    p_description: parsed.values.description,
    p_location_text: parsed.values.locationText,
    p_category: parsed.values.category,
    p_importance: parsed.values.importance,
  });
  if (error || typeof data !== "string") {
    return { error: "Could not save this memory. Please try again." };
  }

  revalidatePath("/universe");
  redirect(`/universe?star=${data}`);
}

export async function updateMemory(
  _previous: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const memoryId = field(formData, "memory_id");
  if (!UUID_PATTERN.test(memoryId)) {
    return { error: "This memory could not be found." };
  }
  const parsed = parseMemory(formData);
  if (parsed.error || !parsed.values) {
    return { error: parsed.error ?? "Could not save this memory." };
  }
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { error } = await supabase.rpc("update_memory", {
    p_memory_id: memoryId,
    p_title: parsed.values.title,
    p_memory_date: parsed.values.memoryDate,
    p_description: parsed.values.description,
    p_location_text: parsed.values.locationText,
    p_category: parsed.values.category,
    p_importance: parsed.values.importance,
  });
  if (error) {
    return { error: "Could not save these changes. Please try again." };
  }

  revalidatePath("/universe");
  redirect(`/universe?star=${memoryId}`);
}

export async function deleteMemory(
  _previous: DeleteMemoryState,
  formData: FormData,
): Promise<DeleteMemoryState> {
  const memoryId = field(formData, "memory_id");
  if (!UUID_PATTERN.test(memoryId)) {
    return { ok: false, error: "This memory could not be found." };
  }
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { error } = await supabase.rpc("delete_memory", { p_memory_id: memoryId });
  if (error) {
    return { ok: false, error: "Could not delete this memory. Please try again." };
  }

  revalidatePath("/universe");
  return { ok: true, error: null };
}
