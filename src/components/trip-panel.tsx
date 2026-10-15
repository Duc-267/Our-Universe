"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTrip, setTripSignificant, toggleTripMemory } from "@/features/trip/actions";

export type TripMemory = {
  id: string;
  title: string;
  memoryDate: string;
  thumbUrl: string | null;
};

export type TripRow = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  note: string | null;
  significant: boolean;
  createdByName: string;
  memories: TripMemory[];
  planet: {
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

export function TripPanel({
  trips,
  selectedId,
  onSelect,
}: {
  trips: TripRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section className="trip-panel" aria-labelledby="trip-heading">
      <div className="trip-card">
        <div className="trip-card-head">
          <h2 id="trip-heading">Trips</h2>
          <Link className="text-button" href="/trip/new">
            Add a trip
          </Link>
        </div>
        <p className="trip-copy">Significant trips become planets in your sky.</p>
        {trips.length === 0 ? (
          <p className="trip-empty">No trips yet.</p>
        ) : (
          <ul className="trip-list">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  className="trip-item"
                  aria-current={selectedId === trip.id ? "true" : undefined}
                  onClick={() => onSelect(selectedId === trip.id ? null : trip.id)}
                >
                  <span className={`trip-mark${trip.significant ? " is-planet" : ""}`} aria-hidden="true" />
                  <span className="trip-text">
                    <span className="trip-title">{trip.destination}</span>
                    <span className="trip-meta">
                      {formatDate(trip.startDate)}
                      {trip.endDate !== trip.startDate ? ` – ${formatDate(trip.endDate)}` : ""}
                      {trip.significant ? " · planet" : ""}
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

export function TripDialog({
  trip,
  availableMemories,
  onClose,
}: {
  trip: TripRow;
  availableMemories: { id: string; title: string; memoryDate: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const linked = new Set(trip.memories.map((memory) => memory.id));

  async function onSignificant(next: boolean) {
    setPending(true);
    setError(null);
    const result = await setTripSignificant(trip.id, next);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function onToggleMemory(memoryId: string) {
    setPending(true);
    setError(null);
    const result = await toggleTripMemory(trip.id, memoryId, linked.has(memoryId));
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    const result = await deleteTrip(trip.id);
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
          <span className={`trip-mark${trip.significant ? " is-planet" : ""} moon-dialog-mark`} aria-hidden="true" />
          <h2>{trip.destination}</h2>
        </div>
        <p className="memory-dialog-meta">
          {formatDate(trip.startDate)}
          {trip.endDate !== trip.startDate ? ` – ${formatDate(trip.endDate)}` : ""}
          {" · "}
          {trip.createdByName}
        </p>
        {trip.note && <p className="memory-dialog-description">{trip.note}</p>}
        {trip.memories.length > 0 && (
          <ul className="trip-linked-memories">
            {trip.memories.map((memory) => (
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
            <legend>Linked memories</legend>
            {availableMemories.map((memory) => (
              <label key={memory.id} className="trip-memory-option">
                <input
                  type="checkbox"
                  checked={linked.has(memory.id)}
                  disabled={pending}
                  onChange={() => onToggleMemory(memory.id)}
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
          <button
            type="button"
            className="primary-button"
            disabled={pending}
            onClick={() => onSignificant(!trip.significant)}
          >
            {trip.significant ? "Remove planet" : "Make planet"}
          </button>
          <button type="button" className="text-button danger-button" disabled={pending} onClick={onDelete}>
            Delete trip
          </button>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
