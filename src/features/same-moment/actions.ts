"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCoupleId, requireUser } from "@/lib/auth";

export type SameMomentState = { error: string | null; momentId: string | null };

export async function startSameMoment(blind: boolean): Promise<SameMomentState> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("start_same_moment", { p_blind: blind });
  if (error || typeof data !== "string") {
    console.error("start_same_moment failed:", error?.message ?? "unexpected rpc result");
    return {
      error: error?.message.includes("same_moment_open")
        ? "There is already an open Same Moment."
        : "Could not start a Same Moment.",
      momentId: null,
    };
  }
  revalidatePath("/universe");
  return { error: null, momentId: data };
}

export async function refreshSameMoments(): Promise<void> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) return;
  await supabase.rpc("refresh_same_moments");
  revalidatePath("/universe");
}
