"use client";

import { useActionState } from "react";
import { saveCheckin, type CheckinState } from "@/features/checkin/actions";
import { CHECKIN_MOODS, moodLabel } from "@/features/checkin/moods";

export type CheckinRow = {
  id: string;
  authorUserId: string;
  authorName: string;
  localDate: string;
  mood: string;
  note: string | null;
  isMine: boolean;
};

const initialState: CheckinState = { error: null };

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function CheckInPanel({ today, checkins }: { today: string; checkins: CheckinRow[] }) {
  const [state, formAction, pending] = useActionState(saveCheckin, initialState);
  const todays = checkins.filter((row) => row.localDate === today);
  const mine = todays.find((row) => row.isMine) ?? null;
  const partner = todays.find((row) => !row.isMine) ?? null;
  const earlier = checkins.filter((row) => row.localDate !== today).slice(0, 12);

  return (
    <section className="checkin-panel" aria-labelledby="checkin-heading">
      <div className="checkin-today">
        <h2 id="checkin-heading">Today</h2>
        {partner ? (
          <p className="checkin-partner">
            {partner.authorName} · {moodLabel(partner.mood)}
            {partner.note ? ` — ${partner.note}` : ""}
          </p>
        ) : (
          <p className="checkin-partner">Your partner has not checked in yet.</p>
        )}
        <form key={`${mine?.mood ?? "new"}:${mine?.note ?? ""}`} action={formAction} className="checkin-form">
          <fieldset className="mood-picker">
            <legend className="sr-only">Mood</legend>
            {CHECKIN_MOODS.map((mood) => (
              <label key={mood} className="mood-option">
                <input type="radio" name="mood" value={mood} defaultChecked={mine?.mood === mood} required />
                <span>{moodLabel(mood)}</span>
              </label>
            ))}
          </fieldset>
          <label className="sr-only" htmlFor="checkin-note">Note</label>
          <input
            id="checkin-note"
            name="note"
            maxLength={280}
            placeholder="A short note, if you want"
            defaultValue={mine?.note ?? ""}
          />
          <button className="primary-button checkin-save" type="submit" disabled={pending}>
            {pending ? "Saving…" : mine ? "Update today" : "Share today"}
          </button>
        </form>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </div>
      {earlier.length > 0 && (
        <details className="checkin-history">
          <summary>Earlier check-ins</summary>
          <ul>
            {earlier.map((row) => (
              <li key={row.id}>
                <span>{formatDate(row.localDate)}</span>
                <span>{row.authorName} · {moodLabel(row.mood)}</span>
                {row.note && <span className="checkin-note">{row.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
