"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { acceptInvitation } from "@/features/couple/actions";

const storageKey = "our-universe-pending-invitation";

export function AcceptInvitation({ signedIn, invalid }: { signedIn: boolean; invalid: boolean }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    const saved = sessionStorage.getItem(storageKey) ?? "";
    const candidate = /^[0-9a-f]{64}$/.test(fragment) ? fragment : saved;
    if (/^[0-9a-f]{64}$/.test(candidate)) {
      sessionStorage.setItem(storageKey, candidate);
    }
    if (fragment) history.replaceState(null, "", "/invite" + window.location.search);
    // The token exists only in browser storage, so hydration must finish before it is read into UI state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(/^[0-9a-f]{64}$/.test(candidate) ? candidate : "");
  }, []);

  if (token === null) return <p className="form-intro">Opening invitation…</p>;
  if (!token) return <>
    {invalid && <p className="form-error" role="alert">This invitation is no longer valid. Ask your partner for a new link.</p>}
    <p className="form-intro">Open the private invitation link your partner shared with you.</p>
  </>;

  return (
    <>
      {invalid && <p className="form-error" role="alert">This invitation is no longer valid. Ask your partner for a new link.</p>}
      {signedIn ? (
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="primary-button">Join our universe</button>
        </form>
      ) : (
        <div className="invite-auth-links">
          <Link className="primary-button" href="/login?next=%2Finvite">Sign in to join</Link>
          <Link href="/sign-up?next=%2Finvite">Create an account</Link>
        </div>
      )}
    </>
  );
}
