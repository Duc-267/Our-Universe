"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { CheckInPanel, type CheckinRow } from "@/components/check-in-panel";
import type { RelationshipAge } from "@/features/couple/age";
import type { CoupleSky } from "@/features/checkin/weather";
import { deleteMemory, type DeleteMemoryState } from "@/features/memory/actions";
import { memoryIcon } from "@/features/memory/icons";
import { categoryColor, STICKER_INK } from "@/features/memory/palette";
import { createClient } from "@/lib/supabase/client";
import { UniverseScene, type SceneStar } from "./universe-scene";

export type UniverseMemory = {
  id: string;
  title: string;
  memoryDate: string;
  description: string | null;
  locationText: string | null;
  category: string;
  importance: number;
  icon: string;
  authorName: string;
  isAuthor: boolean;
  star: {
    type: "STAR" | "BRIGHT_STAR";
    positionX: number;
    positionY: number;
    positionZ: number;
    scale: number;
    brightness: number;
    rotation: number;
    visualSeed: number;
  } | null;
};

type Props = {
  coupleId: string;
  memories: UniverseMemory[];
  age: RelationshipAge;
  canInvite: boolean;
  initialSelectedId: string | null;
  today: string;
  checkins: CheckinRow[];
  sky: CoupleSky;
};

const initialDeleteState: DeleteMemoryState = { ok: false, error: null };

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.3C7.2 16.8 3.9 13.4 3.9 9.9c0-2.6 2-4.6 4.4-4.6 1.5 0 2.9.8 3.7 2.1.8-1.3 2.2-2.1 3.7-2.1 2.4 0 4.4 2 4.4 4.6 0 3.5-3.3 6.9-8.1 10.4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarSticker({ id, category, bright }: { id: string; category: string; bright: boolean }) {
  const icon = memoryIcon(id);
  const rule = icon.evenodd ? "evenodd" : "nonzero";
  return (
    <svg viewBox="-2 -2 28 28" aria-hidden="true" className={`star-sticker${bright ? " is-bright" : ""}`}>
      <path d={icon.d} transform="translate(0.7 1.1)" fill="rgba(20, 10, 36, 0.38)" stroke="rgba(20, 10, 36, 0.38)" strokeWidth="3" strokeLinejoin="round" fillRule={rule} />
      <path d={icon.d} fill={categoryColor(category)} stroke={STICKER_INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" paintOrder="stroke" fillRule={rule} />
    </svg>
  );
}

function TwinStarIcon() {
  return (
    <svg viewBox="0 0 96 48" fill="none" aria-hidden="true" className="universe-twin">
      <circle cx="36" cy="26" r="15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="26" r="15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="48" cy="11.5" r="2.4" fill="currentColor" />
      <circle cx="48" cy="40.5" r="2.4" fill="currentColor" />
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function ageLine(age: RelationshipAge): string {
  const days = age.daysTogether.toLocaleString("en-US");
  if (!age.nextAnniversary) return `${days} days together`;
  if (age.nextAnniversary.daysAway === 0) {
    const years = age.nextAnniversary.number;
    return `${days} days together — happy anniversary, ${years} ${years === 1 ? "year" : "years"} today`;
  }
  const daysAway = age.nextAnniversary.daysAway;
  return `${days} days together · next anniversary in ${daysAway} ${daysAway === 1 ? "day" : "days"}`;
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function UniverseView({
  coupleId,
  memories,
  age,
  canInvite,
  initialSelectedId,
  today,
  checkins,
  sky,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [seenInitialId, setSeenInitialId] = useState(initialSelectedId);
  const [bornId, setBornId] = useState<string | null>(initialSelectedId);
  const [cheer, setCheer] = useState<"star" | "checkin" | null>(initialSelectedId ? "star" : null);
  const knownIds = useRef<Set<string> | null>(null);
  const seenCheckins = useRef<string | null>(null);

  // Adjust state during render when a navigation supplies a new ?star= target,
  // so a freshly created or edited memory opens its dialog without an effect.
  if (initialSelectedId !== seenInitialId) {
    setSeenInitialId(initialSelectedId);
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }

  useEffect(() => {
    const ids = memories.map((memory) => memory.id);
    if (knownIds.current) {
      const fresh = ids.find((id) => !knownIds.current?.has(id));
      if (fresh) {
        setBornId(fresh);
        setCheer("star");
      }
    }
    knownIds.current = new Set(ids);
  }, [memories]);

  useEffect(() => {
    if (!bornId) return;
    const timer = window.setTimeout(() => setBornId(null), 1500);
    return () => window.clearTimeout(timer);
  }, [bornId]);

  useEffect(() => {
    const signature = checkins
      .filter((row) => row.localDate === today)
      .map((row) => `${row.authorUserId}:${row.mood}:${row.note ?? ""}`)
      .join("|");
    if (seenCheckins.current !== null && seenCheckins.current !== signature) setCheer("checkin");
    seenCheckins.current = signature;
  }, [checkins, today]);

  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(null), 1600);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`universe-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cosmic_objects", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_checkins", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, router]);

  const selected = memories.find((memory) => memory.id === selectedId) ?? null;
  const isAnniversary = age.nextAnniversary?.daysAway === 0;

  const closeDetail = () => {
    setSelectedId(null);
    if (window.location.search.includes("star=")) {
      window.history.replaceState(null, "", "/universe");
    }
  };

  const sceneStars: SceneStar[] = memories
    .filter((memory) => memory.star !== null)
    .map((memory) => ({
      memoryId: memory.id,
      title: memory.title,
      positionX: memory.star!.positionX,
      positionY: memory.star!.positionY,
      positionZ: memory.star!.positionZ,
      scale: memory.star!.scale,
      brightness: memory.star!.brightness,
      rotation: memory.star!.rotation,
      visualSeed: memory.star!.visualSeed,
      bright: memory.star!.type === "BRIGHT_STAR",
      category: memory.category,
      icon: memory.icon,
    }));

  return (
    <div className="universe-shell">
      <h1 className="sr-only">Your universe</h1>
      <div className="universe-layout">
        <div className="universe-stage">
          <UniverseScene
            stars={sceneStars}
            selectedId={selectedId}
            onSelect={setSelectedId}
            sky={sky}
            bornId={bornId}
            cheer={cheer}
          />
          <div className="universe-toolbar">
            <p className={`universe-age-chip${isAnniversary ? " is-anniversary" : ""}`}>
              <HeartIcon />
              {ageLine(age)}
            </p>
            <Link className="primary-button universe-add" href="/memory/new">
              <span aria-hidden="true">✦</span> Add a memory
            </Link>
          </div>
          {memories.length === 0 && (
            <section className="universe-empty-overlay" aria-labelledby="universe-title">
              <div className="universe-empty-card">
                <TwinStarIcon />
                <h2 id="universe-title">Your universe begins here.</h2>
                {canInvite ? (
                  <Link className="primary-button universe-action" href="/couple/invite">Invite your partner</Link>
                ) : (
                  <p className="universe-note">A quiet place for the moments you will share.</p>
                )}
              </div>
            </section>
          )}
        </div>
        <CheckInPanel today={today} checkins={checkins} />
      </div>
      {memories.length > 0 && (
        <section className="universe-list" aria-labelledby="universe-stars-heading">
          <div className="universe-list-head">
            <h2 id="universe-stars-heading">Our stars</h2>
            <p className="universe-count">
              {memories.length === 1 ? "1 memory" : `${memories.length} memories`} shining in your universe
            </p>
          </div>
          <ul className="star-list">
            {memories.map((memory) => (
              <li key={memory.id}>
                <button
                  type="button"
                  className="star-option"
                  aria-current={memory.id === selectedId ? "true" : undefined}
                  onClick={() => setSelectedId(memory.id)}
                >
                  <StarSticker
                    id={memory.icon}
                    category={memory.category}
                    bright={memory.star?.type === "BRIGHT_STAR"}
                  />
                  <span className="star-option-text">
                    <span className="star-option-title">{memory.title}</span>
                    <span className="star-option-meta">
                      {formatDate(memory.memoryDate)} · {categoryLabel(memory.category)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {selected && <MemoryDialog memory={selected} onClose={closeDetail} />}
    </div>
  );
}

function MemoryDialog({ memory, onClose }: { memory: UniverseMemory; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(deleteMemory, initialDeleteState);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="memory-dialog"
      aria-labelledby="memory-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <article className="memory-dialog-body">
        <div className="memory-dialog-head">
          <StarSticker id={memory.icon} category={memory.category} bright={memory.star?.type === "BRIGHT_STAR"} />
          <h2 id="memory-dialog-title">{memory.title}</h2>
          <button type="button" className="text-button" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
        <p className="memory-dialog-meta">
          {formatDate(memory.memoryDate)} · saved by {memory.authorName}
          <HeartIcon />
        </p>
        <div className="memory-chip-row">
          <span className="memory-chip">{categoryLabel(memory.category)}</span>
          <span className="memory-chip">Importance {memory.importance}/10</span>
          {memory.star?.type === "BRIGHT_STAR" && <span className="memory-chip is-bright">Bright star</span>}
          <span className="memory-chip">{memoryIcon(memory.icon).label}</span>
        </div>
        {memory.description && <p className="memory-dialog-description">{memory.description}</p>}
        {memory.locationText && (
          <p className="memory-dialog-location">Location: {memory.locationText}</p>
        )}
        {memory.isAuthor && (
          <div className="memory-dialog-actions">
            <Link className="text-button" href={`/memory/${memory.id}/edit`}>Edit memory</Link>
            {confirming ? (
              <form action={formAction}>
                <input type="hidden" name="memory_id" value={memory.id} />
                <button type="submit" className="text-button danger-button" disabled={pending}>
                  {pending ? "Deleting…" : "Confirm delete"}
                </button>
                <button type="button" className="text-button" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </form>
            ) : (
              <button type="button" className="text-button danger-button" onClick={() => setConfirming(true)}>
                Delete memory
              </button>
            )}
          </div>
        )}
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </article>
    </dialog>
  );
}
