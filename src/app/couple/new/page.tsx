import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { createCouple } from "@/features/couple/actions";
import { currentCoupleId, requireUser } from "@/lib/auth";

export default async function NewCouplePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  if (await currentCoupleId(supabase, userId)) redirect("/universe");
  const { error } = await searchParams;

  return (
    <AuthShell>
      <div className="form-wrap">
        <h1>Name your universe</h1>
        <p className="form-intro">Start a private space for the two of you.</p>
        {error && <p className="form-error" role="alert">
          {error === "invalid" ? "Check the name, date, and timezone." : "Could not create your universe. Please try again."}
        </p>}
        <form action={createCouple} className="form-stack">
          <label htmlFor="name">Couple or universe name</label>
          <input id="name" name="name" maxLength={80} required />
          <label htmlFor="relationship_start_date">Relationship start date</label>
          <input id="relationship_start_date" name="relationship_start_date" type="date" required />
          <label htmlFor="nickname">Your nickname <span className="optional">(optional)</span></label>
          <input id="nickname" name="nickname" maxLength={80} />
          <label htmlFor="timezone">Your shared timezone</label>
          <input id="timezone" name="timezone" defaultValue="UTC" list="timezones" required />
          <datalist id="timezones">
            <option value="UTC" />
            <option value="Asia/Bangkok" />
            <option value="Asia/Ho_Chi_Minh" />
            <option value="Europe/London" />
            <option value="America/New_York" />
          </datalist>
          <p className="field-help">Enter an IANA timezone, such as Asia/Bangkok.</p>
          <button className="primary-button" type="submit">Create our space</button>
        </form>
      </div>
    </AuthShell>
  );
}
