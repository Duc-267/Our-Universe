import { AuthShell } from "@/components/auth-shell";
import { AcceptInvitation } from "@/components/accept-invitation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const { error } = await searchParams;

  return (
    <AuthShell>
      <div className="form-wrap">
        <h1>A universe for two</h1>
        <p className="form-intro">Your partner has invited you to share a private space.</p>
        <AcceptInvitation signedIn={Boolean(data?.claims?.sub)} invalid={error === "invalid"} />
      </div>
    </AuthShell>
  );
}
