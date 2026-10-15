"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCoupleId, requireUser } from "@/lib/auth";

export type QuestActionState = { error: string | null; questId: string | null };

export async function startQuest(templateKey: string): Promise<QuestActionState> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("start_quest", { p_template_key: templateKey });
  if (error || typeof data !== "string") {
    console.error("start_quest failed:", error?.message ?? "unexpected rpc result");
    return {
      error: error?.message.includes("quest_open")
        ? "There is already an open quest."
        : "Could not start this quest.",
      questId: null,
    };
  }
  revalidatePath("/universe");
  return { error: null, questId: data };
}
