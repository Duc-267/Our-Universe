import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MemoryForm } from "@/components/memory-form";
import { todayInZone } from "@/features/couple/age";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function NewMemoryPage() {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, settings] = await Promise.all([
    supabase.from("couples").select("name").eq("id", coupleId).single(),
    supabase.from("couple_settings").select("timezone").eq("couple_id", coupleId).single(),
  ]);
  if (couple.error || settings.error) {
    throw new Error("Could not load couple settings.");
  }

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Add a memory</h1>
        <p className="form-intro">Every memory you save becomes a star in your universe.</p>
        <MemoryForm mode="create" defaultDate={todayInZone(settings.data.timezone)} />
      </section>
    </main>
  );
}
