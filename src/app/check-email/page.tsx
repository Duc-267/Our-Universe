import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { safeNextPath } from "@/lib/auth";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  return (
    <AuthShell>
      <div className="form-wrap">
        <h1>Check your email</h1>
        <p className="form-intro">If this email is new, open the confirmation link we sent, then sign in with your password. If you already have an account, sign in instead.{nextPath === "/invite" ? " Return to your invitation link after signing in to join your partner." : ""}</p>
        <p className="form-footer"><Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Return to sign in</Link></p>
      </div>
    </AuthShell>
  );
}
