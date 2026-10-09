import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function UniversePage() {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [coupleResult, membersResult, universeResult] = await Promise.all([
    supabase.from("couples").select("name, created_by").eq("id", coupleId).single(),
    supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
    supabase.from("universes").select("couple_id").eq("couple_id", coupleId).single(),
  ]);
  if (coupleResult.error || membersResult.error || universeResult.error) {
    throw new Error("Could not load your universe.");
  }

  const canInvite = coupleResult.data.created_by === userId && (membersResult.data?.length ?? 0) < 2;
  return (
    <main className="universe-page">
      <AppHeader coupleName={coupleResult.data.name} />
      <section className="universe-empty" aria-labelledby="universe-title">
        <div className="universe-spacer" aria-hidden="true" />
        <h1 id="universe-title">Your universe begins here.</h1>
        {canInvite ? (
          <Link className="primary-button universe-action" href="/couple/invite">Invite your partner</Link>
        ) : (
          <p className="universe-note">A quiet place for the moments you will share.</p>
        )}
      </section>
    </main>
  );
}
