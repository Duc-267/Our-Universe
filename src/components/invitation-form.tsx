"use client";

import { useActionState } from "react";
import { createInvitation, type InvitationState } from "@/features/couple/actions";

const initialState: InvitationState = { link: null, expiresAt: null, error: null };

export function InvitationForm() {
  const [state, formAction, pending] = useActionState(createInvitation, initialState);

  return (
    <div>
      <form action={formAction}>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Creating invitation…" : "Create invitation"}
        </button>
      </form>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.link && (
        <div className="invite-result" aria-live="polite">
          <label htmlFor="invite_link">Private invitation link</label>
          <input id="invite_link" readOnly value={state.link} onFocus={(event) => event.currentTarget.select()} />
          <p className="field-help">Share this link only with your partner. It expires {new Date(state.expiresAt!).toLocaleString()} and works once.</p>
        </div>
      )}
    </div>
  );
}
