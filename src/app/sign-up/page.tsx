import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { safeNextPath } from "@/lib/auth";
import { signUp } from "@/features/auth/actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <AuthShell>
      <div className="form-wrap">
        <h1>Begin together</h1>
        <p className="form-intro">A private space for your shared story.</p>
        {error && <p className="form-error" role="alert">
          {error === "invalid" ? "Check your email, name, and password. Passwords need at least 8 characters." : "Could not create an account. Please try again."}
        </p>}
        <form action={signUp} className="form-stack">
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="display_name">Your name <span className="optional">(optional)</span></label>
          <input id="display_name" name="display_name" maxLength={80} autoComplete="name" />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
          <p className="field-help">Use at least 8 characters.</p>
          <button className="primary-button" type="submit">Create account</button>
        </form>
        <p className="form-footer">
          Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
