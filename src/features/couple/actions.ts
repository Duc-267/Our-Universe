"use server";

import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/supabase/env";
import { currentCoupleId, requireUser } from "@/lib/auth";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCouple(formData: FormData) {
  const name = field(formData, "name");
  const relationshipStartDate = field(formData, "relationship_start_date");
  const nickname = field(formData, "nickname");
  const timezone = field(formData, "timezone");
  if (!name || name.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(relationshipStartDate) || !timezone) {
    redirect("/couple/new?error=invalid");
  }

  const { supabase, userId } = await requireUser();
  if (await currentCoupleId(supabase, userId)) redirect("/universe");
  const { error } = await supabase.rpc("create_couple", {
    p_name: name,
    p_relationship_start_date: relationshipStartDate,
    p_nickname: nickname || null,
    p_timezone: timezone,
  });
  if (error) redirect("/couple/new?error=failed");
  redirect("/universe");
}

export type InvitationState = {
  link: string | null;
  expiresAt: string | null;
  error: string | null;
};

export async function createInvitation(
  _previous: InvitationState,
  _formData: FormData,
): Promise<InvitationState> {
  void _previous;
  void _formData;
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("create_invitation", {
    p_couple_id: coupleId,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return { link: null, expiresAt: null, error: "Could not create an invitation." };
  }

  const { token, expires_at: expiresAt } = data as { token?: unknown; expires_at?: unknown };
  if (typeof token !== "string" || typeof expiresAt !== "string") {
    return { link: null, expiresAt: null, error: "Could not create an invitation." };
  }
  return {
    link: `${new URL("/invite", appOrigin()).toString()}#${token}`,
    expiresAt,
    error: null,
  };
}

export async function acceptInvitation(formData: FormData) {
  const token = field(formData, "token");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/invite?error=invalid");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) redirect("/invite?error=invalid");
  redirect("/universe");
}

export async function updateCouple(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const name = field(formData, "name");
  const relationshipStartDate = field(formData, "relationship_start_date");
  const timezone = field(formData, "timezone");
  const nextMeetingDate = field(formData, "next_meeting_date");
  const displayName = field(formData, "display_name");
  if (!name || name.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(relationshipStartDate) ||
      !timezone || displayName.length > 80 ||
      (nextMeetingDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextMeetingDate))) {
    redirect("/couple/settings?error=invalid");
  }

  const { error } = await supabase.rpc("update_couple_settings", {
    p_couple_id: coupleId,
    p_name: name,
    p_relationship_start_date: relationshipStartDate,
    p_timezone: timezone,
    p_next_meeting_date: nextMeetingDate || null,
    p_display_name: displayName,
  });
  if (error) {
    redirect("/couple/settings?error=failed");
  }
  redirect("/couple/settings?saved=1");
}
