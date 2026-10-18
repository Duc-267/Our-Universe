"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteDream, setDreamStatus, type DreamStatus } from "@/features/dream/actions";

export type DreamRow = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  category: string;
  status: DreamStatus;
  createdByName: string;
  memoryId: string | null;
  distant: {
    positionX: number;
    positionY: number;
    positionZ: number;
    scale: number;
    rotation: number;
    visualSeed: number;
  } | null;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function statusLabel(status: DreamStatus): string {
  if (status === "planned") return "Planned";
  if (status === "completed") return "Done";
  return "Dream";
}

export function DreamPanel({
  dreams,
  selectedId,
  onSelect,
}: {
  dreams: DreamRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section className="dream-panel" aria-labelledby="dream-heading">
      <div className="dream-card">
        <div className="dream-card-head">
          <h2 id="dream-heading">Future dreams</h2>
          <Link className="text-button" href="/dream/new">
            Add a dream
          </Link>
        </div>
        <p className="dream-copy">Open dreams sit far out in the sky. Finishing one turns it into a memory star.</p>
        {dreams.length === 0 ? (
          <p className="dream-empty">No dreams yet.</p>
        ) : (
          <ul className="dream-list">
            {dreams.map((dream) => (
              <li key={dream.id}>
                <button
                  type="button"
                  className="dream-item"
                  aria-current={selectedId === dream.id ? "true" : undefined}
                  onClick={() => onSelect(selectedId === dream.id ? null : dream.id)}
                >
                  <span className={`dream-mark is-${dream.status}`} aria-hidden="true" />
                  <span className="dream-text">
                    <span className="dream-title">{dream.title}</span>
                    <span className="dream-meta">
                      {statusLabel(dream.status)}
                      {" · "}
                      {categoryLabel(dream.category)}
                      {dream.targetDate ? ` · ${formatDate(dream.targetDate)}` : ""}
                    </span>
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

export function DreamDialog({
  dream,
  onClose,
  onOpenMemory,
}: {
  dream: DreamRow;
  onClose: () => void;
  onOpenMemory: (memoryId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const open = dream.status !== "completed";

  async function onStatus(status: DreamStatus) {
    setPending(true);
    setError(null);
    const result = await setDreamStatus(dream.id, status);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    const result = await deleteDream(dream.id);
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
      <div className="memory-dialog-body">
        <div className="memory-dialog-head">
          <span className={`dream-mark is-${dream.status} moon-dialog-mark`} aria-hidden="true" />
          <h2>{dream.title}</h2>
        </div>
        <p className="memory-dialog-meta">
          {statusLabel(dream.status)}
          {" · "}
          {categoryLabel(dream.category)}
          {dream.targetDate ? ` · ${formatDate(dream.targetDate)}` : ""}
          {" · "}
          {dream.createdByName}
        </p>
        {dream.description && <p className="memory-dialog-description">{dream.description}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="memory-dialog-actions">
          {open && (
            <>
              <button type="button" className="text-button" disabled={pending || dream.status === "dream"} onClick={() => onStatus("dream")}>
                Dream
              </button>
              <button type="button" className="text-button" disabled={pending || dream.status === "planned"} onClick={() => onStatus("planned")}>
                Plan it
              </button>
              <button type="button" className="primary-button" disabled={pending} onClick={() => onStatus("completed")}>
                We did this
              </button>
              <button type="button" className="text-button danger-button" disabled={pending} onClick={onDelete}>
                Delete dream
              </button>
            </>
          )}
          {dream.memoryId && (
            <button type="button" className="primary-button" onClick={() => onOpenMemory(dream.memoryId!)}>
              Open the memory
            </button>
          )}
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
