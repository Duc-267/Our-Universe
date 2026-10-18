import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DreamForm } from "@/components/dream-form";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function NewDreamPage() {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const couple = await supabase.from("couples").select("name").eq("id", coupleId).single();
  if (couple.error) throw new Error("Could not load dream form.");

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Add a dream</h1>
        <p className="form-intro">
          Save something you hope to do together. It stays far out in the sky until you mark it done.
        </p>
        <DreamForm />
      </section>
    </main>
  );
}
