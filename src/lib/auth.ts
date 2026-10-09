import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function safeNextPath(value: unknown): string {
  return value === "/invite"
    ? value
    : "/universe";
}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    redirect("/login");
  }
  return { supabase, userId: data.claims.sub };
}

export async function currentCoupleId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.couple_id ?? null;
}
