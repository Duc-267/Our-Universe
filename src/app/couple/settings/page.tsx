import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { updateCouple } from "@/features/couple/actions";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const coupleId = await currentCoupleId(supabase, userId);
  if (!coupleId) redirect("/couple/new");

  const [couple, settings, profile, members] = await Promise.all([
    supabase.from("couples").select("name, relationship_start_date").eq("id", coupleId).single(),
    supabase.from("couple_settings").select("timezone, next_meeting_date").eq("couple_id", coupleId).single(),
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
  ]);
  if (couple.error || settings.error || profile.error || members.error) {
    throw new Error("Could not load couple settings.");
  }
  const memberIds = members.data.map((member) => member.user_id);
  const memberProfiles = await supabase.from("profiles")
    .select("id, display_name, avatar_url").in("id", memberIds);
  if (memberProfiles.error) throw new Error("Could not load members.");
  const { error, saved } = await searchParams;

  return (
    <main className="interior-page">
      <AppHeader coupleName={couple.data.name} />
      <section className="interior-content settings-content">
        <Link className="back-link" href="/universe">← Back to universe</Link>
        <h1>Our space</h1>
        <p className="form-intro">The details that make this universe yours.</p>
        {error && <p className="form-error" role="alert">Could not save these changes. Check the values and try again.</p>}
        {saved && <p className="form-success" role="status">Changes saved.</p>}
        <form action={updateCouple} className="form-stack">
          <label htmlFor="name">Couple name</label>
          <input id="name" name="name" defaultValue={couple.data.name} maxLength={80} required />
          <label htmlFor="relationship_start_date">Relationship start date</label>
          <input id="relationship_start_date" name="relationship_start_date" type="date" defaultValue={couple.data.relationship_start_date} required />
          <label htmlFor="display_name">Your display name</label>
          <input id="display_name" name="display_name" defaultValue={profile.data.display_name} maxLength={80} />
          <label htmlFor="timezone">Shared timezone</label>
          <input id="timezone" name="timezone" defaultValue={settings.data.timezone} required />
          <p className="field-help">Use an IANA timezone, such as Asia/Bangkok.</p>
          <label htmlFor="next_meeting_date">Next meeting date <span className="optional">(optional)</span></label>
          <input id="next_meeting_date" name="next_meeting_date" type="date" defaultValue={settings.data.next_meeting_date ?? ""} />
          <button className="primary-button" type="submit">Save changes</button>
        </form>
        <section className="members-section" aria-labelledby="members-heading">
          <h2 id="members-heading">People in this universe</h2>
          <p className="member-note">{members.data.length} of 2 members have joined.</p>
          <ul className="member-list">
            {memberProfiles.data.map((member) => (
              <li key={member.id}>
                <span className="member-avatar" aria-hidden="true">
                  {(member.display_name || "?").slice(0, 1).toUpperCase()}
                </span>
                <span>{member.display_name || (member.id === userId ? "You" : "Your partner")}</span>
                {member.id === userId && <span className="member-self">You</span>}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
