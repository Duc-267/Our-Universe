"use client";

import { useState, type FormEvent } from "react";
import { createConstellation } from "@/features/constellation/actions";

type MemoryOption = { id: string; title: string; memoryDate: string };

export function ConstellationForm({ memories }: { memories: MemoryOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createConstellation(new FormData(event.currentTarget));
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label htmlFor="name">Name</label>
      <input id="name" name="name" required maxLength={80} placeholder="Late Night Calls" />

      <label htmlFor="note">
        Note <span className="optional">(optional)</span>
      </label>
      <textarea id="note" name="note" maxLength={500} rows={3} placeholder="What ties these stars together" />

      <fieldset className="trip-memory-picker">
        <legend>Member stars</legend>
        <p className="field-help">Choose at least two memories to connect.</p>
        {memories.length === 0 ? (
          <p className="field-help">Add memories first, then come back to group them.</p>
        ) : (
          memories.map((memory) => (
            <label key={memory.id} className="trip-memory-option">
              <input type="checkbox" name="memory_ids" value={memory.id} />
              <span>
                {memory.title}
                <span className="trip-memory-date">{memory.memoryDate}</span>
              </span>
            </label>
          ))
        )}
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending || memories.length < 2}>
        {pending ? "Saving…" : "Save constellation"}
      </button>
    </form>
  );
}
