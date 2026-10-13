"use server";

import { revalidatePath } from "next/cache";
import { currentCoupleId, requireUser } from "@/lib/auth";
import { isCheckinMood } from "./moods";

export type CheckinState = { error: string | null };

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveCheckin(
  _previous: CheckinState,
  formData: FormData,
): Promise<CheckinState> {
  const mood = field(formData, "mood");
  const note = field(formData, "note");
  if (!isCheckinMood(mood)) {
    return { error: "Choose how today feels." };
  }
  if (note.length > 280) {
    return { error: "Notes are limited to 280 characters." };
  }

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) return { error: "Join a universe before checking in." };

  const { error } = await supabase.rpc("save_checkin", {
    p_mood: mood,
    p_note: note || null,
  });
  if (error) {
    console.error("save_checkin failed:", error.message);
    return { error: "Could not save today's check-in. Please try again." };
  }

  revalidatePath("/universe");
  return { error: null };
}
