import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { TripForm } from "@/components/trip-form";
import { todayInZone } from "@/features/couple/age";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function NewTripPage() {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, settings, memories] = await Promise.all([
    supabase.from("couples").select("name").eq("id", coupleId).single(),
    supabase.from("couple_settings").select("timezone").eq("couple_id", coupleId).single(),
    supabase
      .from("memories")
      .select("id, title, memory_date")
      .eq("couple_id", coupleId)
      .order("memory_date", { ascending: false })
      .limit(40),
  ]);
  if (couple.error || settings.error || memories.error) {
    throw new Error("Could not load trip form.");
  }

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Add a trip</h1>
        <p className="form-intro">
          Save a journey you shared. Mark it significant to place a planet in your universe.
        </p>
        <TripForm
          today={todayInZone(settings.data.timezone)}
          memories={memories.data.map((memory) => ({
            id: memory.id,
            title: memory.title,
            memoryDate: memory.memory_date,
          }))}
        />
      </section>
    </main>
  );
}
