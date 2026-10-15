import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConstellationForm } from "@/components/constellation-form";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function NewConstellationPage() {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, memories] = await Promise.all([
    supabase.from("couples").select("name").eq("id", coupleId).single(),
    supabase
      .from("memories")
      .select("id, title, memory_date")
      .eq("couple_id", coupleId)
      .order("memory_date", { ascending: false })
      .limit(60),
  ]);
  if (couple.error || memories.error) {
    throw new Error("Could not load constellation form.");
  }

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Group stars</h1>
        <p className="form-intro">
          Name a constellation and choose the memories that belong together. Soft lines will join them in your sky.
        </p>
        <ConstellationForm
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
