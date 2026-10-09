import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { InvitationForm } from "@/components/invitation-form";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function InvitePartnerPage() {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");
  const [couple, members] = await Promise.all([
    supabase.from("couples").select("name, created_by").eq("id", coupleId).single(),
    supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
  ]);
  if (couple.error || members.error) throw new Error("Could not load couple.");
  if (couple.data.created_by !== userId) redirect("/universe");

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Invite your partner</h1>
        {(members.data?.length ?? 0) >= 2 ? (
          <p>Your shared universe already has two members.</p>
        ) : (
          <>
            <p className="form-intro">Create a private link and share it with the person you want to join.</p>
            <InvitationForm />
          </>
        )}
      </section>
    </main>
  );
}
