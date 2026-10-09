import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { safeNextPath } from "@/lib/auth";
import { signIn } from "@/features/auth/actions";

const messages: Record<string, string> = {
  missing: "Enter your email and password.",
  credentials: "Those details did not work. Please try again.",
  callback: "The sign-in link could not be verified. Please sign in again.",
  "confirmation-signin": "The email link was opened, but automatic sign-in could not finish. Sign in with the email and password you just created.",
  expired: "This email link has expired or was already used. If your email is confirmed, sign in with your password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <AuthShell>
      <div className="form-wrap">
        <h1>Welcome back</h1>
        <p className="form-intro">Return to your shared universe.</p>
        {error && <p className="form-error" role="alert">{messages[error] ?? "Sign-in failed."}</p>}
        <form action={signIn} className="form-stack">
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button className="primary-button" type="submit">Sign in</button>
        </form>
        <p className="form-footer">
          Don&apos;t have an account? <Link href={`/sign-up?next=${encodeURIComponent(nextPath)}`}>Create an account</Link>
        </p>
      </div>
    </AuthShell>
  );
}
