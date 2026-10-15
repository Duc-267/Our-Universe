"use client";

import { useState, type FormEvent } from "react";
import { createTrip } from "@/features/trip/actions";

type MemoryOption = { id: string; title: string; memoryDate: string };

export function TripForm({
  today,
  memories,
}: {
  today: string;
  memories: MemoryOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createTrip(new FormData(event.currentTarget));
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label htmlFor="destination">Destination</label>
      <input id="destination" name="destination" required maxLength={120} placeholder="Hanoi" />

      <label htmlFor="start_date">Start date</label>
      <input id="start_date" name="start_date" type="date" required defaultValue={today} />

      <label htmlFor="end_date">End date</label>
      <input id="end_date" name="end_date" type="date" required defaultValue={today} />

      <label htmlFor="note">
        Note <span className="optional">(optional)</span>
      </label>
      <textarea id="note" name="note" maxLength={500} rows={3} placeholder="What made this trip ours" />

      <label className="trip-significant">
        <input type="checkbox" name="significant" defaultChecked />
        Mark as significant — appear as a planet
      </label>

      {memories.length > 0 && (
        <fieldset className="trip-memory-picker">
          <legend>Link memories</legend>
          <p className="field-help">Photos on those memories show on the trip card.</p>
          {memories.map((memory) => (
            <label key={memory.id} className="trip-memory-option">
              <input type="checkbox" name="memory_ids" value={memory.id} />
              <span>
                {memory.title}
                <span className="trip-memory-date">{memory.memoryDate}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save trip"}
      </button>
    </form>
  );
}
