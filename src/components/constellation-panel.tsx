"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { deleteConstellation, updateConstellation } from "@/features/constellation/actions";

export type ConstellationMemory = {
  id: string;
  title: string;
  memoryDate: string;
  thumbUrl: string | null;
};

export type ConstellationRow = {
  id: string;
  name: string;
  note: string | null;
  createdByName: string;
  memories: ConstellationMemory[];
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function ConstellationPanel({
  constellations,
  selectedId,
  onSelect,
}: {
  constellations: ConstellationRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section className="constellation-panel" aria-labelledby="constellation-heading">
      <div className="constellation-card">
        <div className="constellation-card-head">
          <h2 id="constellation-heading">Constellations</h2>
          <Link className="text-button" href="/constellation/new">
            Group stars
          </Link>
        </div>
        <p className="constellation-copy">Related memories join with soft lines across your sky.</p>
        {constellations.length === 0 ? (
          <p className="constellation-empty">No constellations yet.</p>
        ) : (
          <ul className="constellation-list">
            {constellations.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="constellation-item"
                  aria-current={selectedId === row.id ? "true" : undefined}
                  onClick={() => onSelect(selectedId === row.id ? null : row.id)}
                >
                  <span className="constellation-mark" aria-hidden="true" />
                  <span className="constellation-text">
                    <span className="constellation-title">{row.name}</span>
                    <span className="constellation-meta">{row.memories.length} stars</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ConstellationDialog({
  constellation,
  availableMemories,
  onClose,
}: {
  constellation: ConstellationRow;
  availableMemories: { id: string; title: string; memoryDate: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const linked = new Set(constellation.memories.map((memory) => memory.id));

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await updateConstellation(constellation.id, new FormData(event.currentTarget));
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    const result = await deleteConstellation(constellation.id);
    setPending(false);
    if (result.error) setError(result.error);
    else {
      onClose();
      router.refresh();
    }
  }

  return (
    <dialog
      className="memory-dialog"
      open
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="memory-dialog-body" onSubmit={onSave}>
        <div className="memory-dialog-head">
          <span className="constellation-mark moon-dialog-mark" aria-hidden="true" />
          <h2>
            <input
              className="constellation-name-input"
              name="name"
              defaultValue={constellation.name}
              required
              maxLength={80}
              aria-label="Constellation name"
            />
          </h2>
        </div>
        <p className="memory-dialog-meta">{constellation.createdByName}</p>
        <label htmlFor="constellation-note" className="sr-only">
          Note
        </label>
        <textarea
          id="constellation-note"
          name="note"
          maxLength={500}
          rows={2}
          defaultValue={constellation.note ?? ""}
          placeholder="Optional note"
        />
        {constellation.memories.length > 0 && (
          <ul className="trip-linked-memories">
            {constellation.memories.map((memory) => (
              <li key={memory.id}>
                {memory.thumbUrl && <img src={memory.thumbUrl} alt="" />}
                <span>
                  <strong>{memory.title}</strong>
                  <span className="trip-memory-date">{formatDate(memory.memoryDate)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {availableMemories.length > 0 && (
          <fieldset className="trip-memory-picker">
            <legend>Member stars</legend>
            {availableMemories.map((memory) => (
              <label key={memory.id} className="trip-memory-option">
                <input
                  type="checkbox"
                  name="memory_ids"
                  value={memory.id}
                  defaultChecked={linked.has(memory.id)}
                  disabled={pending}
                />
                <span>
                  {memory.title}
                  <span className="trip-memory-date">{formatDate(memory.memoryDate)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="memory-dialog-actions">
          <button type="submit" className="primary-button" disabled={pending}>
            Save
          </button>
          <button type="button" className="text-button danger-button" disabled={pending} onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </dialog>
  );
}
