import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MemoryForm } from "@/components/memory-form";
import { currentCoupleId, requireUser } from "@/lib/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, memory] = await Promise.all([
    supabase.from("couples").select("name").eq("id", coupleId).single(),
    supabase
      .from("memories")
      .select(
        "id, title, memory_date, description, location_text, category, importance, author_user_id",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (couple.error) throw new Error("Could not load couple.");
  if (!memory.data) notFound();
  if (memory.data.author_user_id !== userId) redirect("/universe");

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Edit memory</h1>
        <p className="form-intro">
          Adjust the story behind this star. Its place in the universe stays the same.
        </p>
        <MemoryForm
          mode="edit"
          memory={{
            id: memory.data.id,
            title: memory.data.title,
            memoryDate: memory.data.memory_date,
            description: memory.data.description,
            locationText: memory.data.location_text,
            category: memory.data.category,
            importance: memory.data.importance,
          }}
        />
      </section>
    </main>
  );
}
