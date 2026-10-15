"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCoupleId, requireUser } from "@/lib/auth";

export type TripFormState = { error: string | null; tripId: string | null };

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTrip(formData: FormData): Promise<TripFormState> {
  const destination = field(formData, "destination");
  const startDate = field(formData, "start_date");
  const endDate = field(formData, "end_date");
  const note = field(formData, "note");
  const significant = formData.get("significant") === "on";
  const memoryIds = formData.getAll("memory_ids").filter((value): value is string => typeof value === "string");

  if (!destination || destination.length > 120) {
    return { error: "Give this trip a destination of up to 120 characters.", tripId: null };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { error: "Choose start and end dates.", tripId: null };
  }
  if (endDate < startDate) {
    return { error: "The end date must be on or after the start date.", tripId: null };
  }
  if (note.length > 500) {
    return { error: "Keep the note to 500 characters.", tripId: null };
  }

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data, error } = await supabase.rpc("create_trip", {
    p_destination: destination,
    p_start_date: startDate,
    p_end_date: endDate,
    p_note: note || null,
    p_significant: significant,
  });
  if (error || typeof data !== "string") {
    console.error("create_trip failed:", error?.message ?? "unexpected rpc result");
    return { error: "Could not save this trip.", tripId: null };
  }

  for (const memoryId of memoryIds) {
    const linked = await supabase.rpc("link_trip_memory", {
      p_trip_id: data,
      p_memory_id: memoryId,
    });
    if (linked.error) {
      console.error("link_trip_memory failed:", linked.error.message);
    }
  }

  revalidatePath("/universe");
  redirect(`/universe?trip=${data}`);
}

export async function setTripSignificant(tripId: string, significant: boolean): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const { data: trip, error: loadError } = await supabase
    .from("trips")
    .select("destination, start_date, end_date, note")
    .eq("id", tripId)
    .eq("couple_id", coupleId)
    .single();
  if (loadError || !trip) return { error: "Could not update this trip." };

  const { error } = await supabase.rpc("update_trip", {
    p_trip_id: tripId,
    p_destination: trip.destination,
    p_start_date: trip.start_date,
    p_end_date: trip.end_date,
    p_note: trip.note,
    p_significant: significant,
  });
  if (error) return { error: "Could not update this trip." };
  revalidatePath("/universe");
  return { error: null };
}

export async function deleteTrip(tripId: string): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const { error } = await supabase.rpc("delete_trip", { p_trip_id: tripId });
  if (error) return { error: "Could not delete this trip." };
  revalidatePath("/universe");
  return { error: null };
}

export async function toggleTripMemory(
  tripId: string,
  memoryId: string,
  linked: boolean,
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const { error } = linked
    ? await supabase.rpc("unlink_trip_memory", { p_trip_id: tripId, p_memory_id: memoryId })
    : await supabase.rpc("link_trip_memory", { p_trip_id: tripId, p_memory_id: memoryId });
  if (error) return { error: "Could not update trip memories." };
  revalidatePath("/universe");
  return { error: null };
}
