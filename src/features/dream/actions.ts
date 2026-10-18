"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MEMORY_CATEGORIES, type MemoryCategory } from "@/features/memory/categories";
import { currentCoupleId, requireUser } from "@/lib/auth";

export type DreamStatus = "dream" | "planned" | "completed";

export type DreamFormState = { error: string | null; dreamId: string | null };

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isCategory(value: string): value is MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(value);
}

export async function createDream(formData: FormData): Promise<DreamFormState> {
  const title = field(formData, "title");
  const description = field(formData, "description");
  const targetDate = field(formData, "target_date");
  const category = field(formData, "category");

  if (!title || title.length > 120) {
    return { error: "Give this dream a title of up to 120 characters.", dreamId: null };
  }
  if (description.length > 2000) {
    return { error: "Keep the description to 2000 characters.", dreamId: null };
  }
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return { error: "Choose a real target date, or leave it blank.", dreamId: null };
  }
  if (!isCategory(category)) {
    return { error: "Choose a category.", dreamId: null };
  }

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("create_dream", {
    p_title: title,
    p_description: description || null,
    p_target_date: targetDate || null,
    p_category: category,
  });
  if (error || typeof data !== "string") {
    console.error("create_dream failed:", error?.message ?? "unexpected rpc result");
    return { error: "Could not save this dream.", dreamId: null };
  }

  revalidatePath("/universe");
  redirect(`/universe?dream=${data}`);
}

export async function setDreamStatus(
  dreamId: string,
  status: DreamStatus,
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data: dream, error: loadError } = await supabase
    .from("future_dreams")
    .select("title, description, target_date, category, status")
    .eq("id", dreamId)
    .eq("couple_id", coupleId)
    .single();
  if (loadError || !dream) return { error: "Could not update this dream." };
  if (dream.status === "completed") return { error: "This dream is already a memory." };

  const { error } = await supabase.rpc("update_dream", {
    p_dream_id: dreamId,
    p_title: dream.title,
    p_description: dream.description,
    p_target_date: dream.target_date,
    p_category: dream.category,
    p_status: status,
  });
  if (error) return { error: "Could not update this dream." };
  revalidatePath("/universe");
  return { error: null };
}

export async function deleteDream(dreamId: string): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const { error } = await supabase.rpc("delete_dream", { p_dream_id: dreamId });
  if (error) return { error: "Could not delete this dream." };
  revalidatePath("/universe");
  return { error: null };
}
