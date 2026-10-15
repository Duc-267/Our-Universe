"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { CheckInPanel, type CheckinRow } from "@/components/check-in-panel";
import { MilestonesPanel, type UniverseMilestone } from "@/components/milestones-panel";
import { SameMomentDialog, SameMomentPanel, type SameMomentRow } from "@/components/same-moment-panel";
import type { RelationshipAge } from "@/features/couple/age";
import type { CoupleSky } from "@/features/checkin/weather";
import { deleteCapsule, openCapsule } from "@/features/capsule/actions";
import { deleteMemory, type DeleteMemoryState } from "@/features/memory/actions";
import { memoryIcon } from "@/features/memory/icons";
import { categoryColor, STICKER_INK } from "@/features/memory/palette";
import { createClient } from "@/lib/supabase/client";
import {
  UniverseScene,
  type SceneCapsule,
  type SceneMoon,
  type SceneStar,
  type SceneTwin,
} from "./universe-scene";

export type UniverseMemory = {
  id: string;
  title: string;
  memoryDate: string;
  description: string | null;
  locationText: string | null;
  category: string;
  importance: number;
  icon: string;
  photos: { id: string; thumbUrl: string; fullPath: string }[];
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

export type UniverseCapsule = {
  id: string;
  creatorName: string;
  isCreator: boolean;
  unlockDate: string;
  openedAt: string | null;
  canOpen: boolean;
  title: string | null;
  message: string | null;
  image: { thumbUrl: string; fullPath: string } | null;
  comet: {
    positionX: number;
    positionY: number;
    positionZ: number;
    scale: number;
    rotation: number;
    visualSeed: number;
  } | null;
};

type Selection = { kind: "star" | "capsule" | "moment" | "moon"; id: string } | null;

type Props = {
  coupleId: string;
  userId: string;
  memories: UniverseMemory[];
  capsules: UniverseCapsule[];
  moments: SameMomentRow[];
  milestones: UniverseMilestone[];
  age: RelationshipAge;
  canInvite: boolean;
  initialSelectedId: string | null;
  initialCapsuleId: string | null;
  initialMomentId: string | null;
  initialMoonId: string | null;
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

function capsuleLabel(capsule: UniverseCapsule): string {
  if (capsule.title) return capsule.title;
  if (capsule.canOpen) return "Ready to open";
  return `Locked until ${formatDate(capsule.unlockDate)}`;
}

export function UniverseView({
  coupleId,
  userId,
  memories,
  capsules,
  moments,
  milestones,
  age,
  canInvite,
  initialSelectedId,
  initialCapsuleId,
  initialMomentId,
  initialMoonId,
  today,
  checkins,
  sky,
}: Props) {
  const router = useRouter();
  const initialSelection: Selection = initialSelectedId
    ? { kind: "star", id: initialSelectedId }
    : initialCapsuleId
      ? { kind: "capsule", id: initialCapsuleId }
      : initialMomentId
        ? { kind: "moment", id: initialMomentId }
        : initialMoonId
          ? { kind: "moon", id: initialMoonId }
          : null;
  const [selected, setSelected] = useState<Selection>(initialSelection);
  const [seenSelection, setSeenSelection] = useState(initialSelection?.id ?? null);
  const [bornId, setBornId] = useState<string | null>(initialSelection?.id ?? null);
  const [cheer, setCheer] = useState<"star" | "checkin" | null>(initialSelectedId ? "star" : null);
  const knownIds = useRef<Set<string> | null>(null);
  const seenCheckins = useRef<string | null>(null);

  const selectionKey = initialSelection?.id ?? null;
  // A new ?star= or ?capsule= target opens its dialog without waiting for an effect.
  if (selectionKey !== seenSelection) {
    setSeenSelection(selectionKey);
    if (initialSelection) setSelected(initialSelection);
  }

  useEffect(() => {
    const ids = [
      ...memories.map((memory) => memory.id),
      ...capsules.map((capsule) => capsule.id),
      ...moments.filter((moment) => moment.status === "complete").map((moment) => moment.id),
      ...milestones.filter((milestone) => milestone.kind === "anniversary").map((milestone) => milestone.id),
    ];
    if (knownIds.current) {
      const fresh = ids.find((id) => !knownIds.current?.has(id));
      if (fresh) {
        setBornId(fresh);
        setCheer("star");
      }
    }
    knownIds.current = new Set(ids);
  }, [memories, capsules, moments, milestones]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "capsules", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memory_photos", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "same_moments", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "same_moment_submissions", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones", filter: `couple_id=eq.${coupleId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, router]);

  const selectedMemory = selected?.kind === "star"
    ? memories.find((memory) => memory.id === selected.id) ?? null
    : null;
  const selectedCapsule = selected?.kind === "capsule"
    ? capsules.find((capsule) => capsule.id === selected.id) ?? null
    : null;
  const selectedMoment = selected?.kind === "moment"
    ? moments.find((moment) => moment.id === selected.id) ?? null
    : null;
  const selectedMilestone = selected?.kind === "moon"
    ? milestones.find((milestone) => milestone.id === selected.id) ?? null
    : null;
  const isAnniversary = age.nextAnniversary?.daysAway === 0;

  const closeDetail = () => {
    setSelected(null);
    if (
      window.location.search.includes("star=")
      || window.location.search.includes("capsule=")
      || window.location.search.includes("moment=")
      || window.location.search.includes("moon=")
    ) {
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
  const sceneCapsules: SceneCapsule[] = capsules
    .filter((capsule) => capsule.comet !== null)
    .map((capsule) => ({
      id: capsule.id,
      title: capsuleLabel(capsule),
      state: capsule.openedAt ? "open" : capsule.canOpen ? "ready" : "locked",
      positionX: capsule.comet!.positionX,
      positionY: capsule.comet!.positionY,
      positionZ: capsule.comet!.positionZ,
      scale: capsule.comet!.scale,
      rotation: capsule.comet!.rotation,
      visualSeed: capsule.comet!.visualSeed,
    }));
  const sceneTwins: SceneTwin[] = moments.flatMap((moment) =>
    moment.twins.map((twin) => ({
      momentId: moment.id,
      title: moment.status === "complete" ? "Twin stars" : "Same Moment",
      slot: twin.slot,
      positionX: twin.positionX,
      positionY: twin.positionY,
      positionZ: twin.positionZ,
      scale: twin.scale,
      rotation: twin.rotation,
      visualSeed: twin.visualSeed,
    })),
  );
  const sceneMoons: SceneMoon[] = milestones
    .filter((milestone) => milestone.kind === "anniversary" && milestone.moon)
    .map((milestone) => ({
      milestoneId: milestone.id,
      title: milestone.title,
      number: Number(milestone.key),
      positionX: milestone.moon!.positionX,
      positionY: milestone.moon!.positionY,
      positionZ: milestone.moon!.positionZ,
      scale: milestone.moon!.scale,
      rotation: milestone.moon!.rotation,
      visualSeed: milestone.moon!.visualSeed,
    }));

  return (
    <div className="universe-shell">
      <h1 className="sr-only">Your universe</h1>
      <div className="universe-layout">
        <div className="universe-stage">
          <UniverseScene
            stars={sceneStars}
            capsules={sceneCapsules}
            twins={sceneTwins}
            moons={sceneMoons}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
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
            <Link className="universe-seal" href="/capsule/new">Seal a capsule</Link>
          </div>
          {memories.length === 0 && capsules.length === 0 && (
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
        <div className="universe-side">
          <CheckInPanel coupleId={coupleId} today={today} checkins={checkins} />
          <SameMomentPanel
            coupleId={coupleId}
            userId={userId}
            moments={moments}
            selectedId={selected?.kind === "moment" ? selected.id : null}
            onSelect={(id) => setSelected(id ? { kind: "moment", id } : null)}
          />
          <MilestonesPanel
            milestones={milestones}
            selectedId={selected?.kind === "moon" ? selected.id : null}
            onSelect={(id) => setSelected(id ? { kind: "moon", id } : null)}
          />
        </div>
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
                  aria-current={selected?.kind === "star" && memory.id === selected.id ? "true" : undefined}
                  onClick={() => setSelected({ kind: "star", id: memory.id })}
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
                      {memory.photos.length > 0 ? ` · ${memory.photos.length} ${memory.photos.length === 1 ? "photo" : "photos"}` : ""}
                    </span>
                  </span>
                  {memory.photos[0]?.thumbUrl && (
                    <img className="star-thumb" src={memory.photos[0].thumbUrl} alt="" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {capsules.length > 0 && (
        <section className="universe-list" aria-labelledby="universe-capsules-heading">
          <div className="universe-list-head">
            <h2 id="universe-capsules-heading">Capsules</h2>
            <p className="universe-count">Messages waiting in the distance</p>
          </div>
          <ul className="star-list">
            {capsules.map((capsule) => (
              <li key={capsule.id}>
                <button
                  type="button"
                  className="star-option"
                  aria-current={selected?.kind === "capsule" && capsule.id === selected.id ? "true" : undefined}
                  onClick={() => setSelected({ kind: "capsule", id: capsule.id })}
                >
                  <span className={`capsule-mark is-${capsule.openedAt ? "open" : capsule.canOpen ? "ready" : "locked"}`} aria-hidden="true" />
                  <span className="star-option-text">
                    <span className="star-option-title">{capsuleLabel(capsule)}</span>
                    <span className="star-option-meta">
                      {capsule.openedAt ? `Opened ${formatDate(capsule.openedAt.slice(0, 10))}` : `Unlocks ${formatDate(capsule.unlockDate)}`}
                      {" · "}sealed by {capsule.creatorName}
                    </span>
                  </span>
                  {capsule.image?.thumbUrl && <img className="star-thumb" src={capsule.image.thumbUrl} alt="" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {selectedMemory && <MemoryDialog memory={selectedMemory} onClose={closeDetail} />}
      {selectedCapsule && <CapsuleDialog capsule={selectedCapsule} onClose={closeDetail} />}
      {selectedMoment && <SameMomentDialog moment={selectedMoment} onClose={closeDetail} />}
      {selectedMilestone && <MoonDialog milestone={selectedMilestone} onClose={closeDetail} />}
    </div>
  );
}

function MoonDialog({
  milestone,
  onClose,
}: {
  milestone: UniverseMilestone;
  onClose: () => void;
}) {
  const copy =
    milestone.kind === "anniversary"
      ? `A moon for year ${milestone.key} together. It stays in your sky.`
      : `${milestone.key} days written into your shared history.`;
  return (
    <dialog className="memory-dialog" open onClose={onClose} onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="memory-dialog-body">
        <div className="memory-dialog-head">
          <span className={`milestones-mark is-${milestone.kind} moon-dialog-mark`} aria-hidden="true" />
          <h2>{milestone.title}</h2>
        </div>
        <p className="memory-dialog-meta">Reached {formatDate(milestone.reachedOn)}</p>
        <p className="memory-dialog-description">{copy}</p>
        <div className="memory-dialog-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

function PhotoStrip({ photos }: { photos: UniverseMemory["photos"] }) {
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [fullError, setFullError] = useState<string | null>(null);

  if (photos.length === 0) return null;
  return (
    <>
      <ul className="photo-grid">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={async () => {
                setFullError(null);
                const { data, error } = await createClient()
                  .storage.from("universe-media")
                  .createSignedUrl(photo.fullPath, 120);
                if (error || !data?.signedUrl) setFullError("Could not open this photo.");
                else setFullUrl(data.signedUrl);
              }}
            >
              {photo.thumbUrl ? <img src={photo.thumbUrl} alt={`Photo ${index + 1} from this memory`} /> : <span>Photo</span>}
            </button>
          </li>
        ))}
      </ul>
      {fullError && <p className="form-error" role="alert">{fullError}</p>}
      {fullUrl && (
        <div className="photo-full-wrap">
          <button type="button" className="text-button" onClick={() => setFullUrl(null)}>Close photo</button>
          <img src={fullUrl} alt="Full size memory photo" />
        </div>
      )}
    </>
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
        <PhotoStrip photos={memory.photos} />
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

function CapsuleDialog({ capsule, onClose }: { capsule: UniverseCapsule; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const locked = !capsule.title;
  return (
    <dialog
      ref={dialogRef}
      className="memory-dialog"
      aria-labelledby="capsule-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <article className="memory-dialog-body">
        <div className="memory-dialog-head">
          <span className={`capsule-mark is-${capsule.openedAt ? "open" : capsule.canOpen ? "ready" : "locked"}`} aria-hidden="true" />
          <h2 id="capsule-dialog-title">{locked ? `Locked until ${formatDate(capsule.unlockDate)}` : capsule.title}</h2>
          <button type="button" className="text-button" onClick={() => dialogRef.current?.close()}>Close</button>
        </div>
        <p className="memory-dialog-meta">Sealed by {capsule.creatorName}</p>
        {locked ? (
          <p className="memory-dialog-description">Locked until {formatDate(capsule.unlockDate)}.</p>
        ) : (
          <>
            <p className="memory-dialog-description">{capsule.message}</p>
            {capsule.image?.thumbUrl && (
              <button
                type="button"
                className="photo-open"
                onClick={async () => {
                  const { data } = await createClient().storage.from("universe-media").createSignedUrl(capsule.image!.fullPath, 120);
                  if (data?.signedUrl) setFullUrl(data.signedUrl);
                  else setError("Could not open this photo.");
                }}
              >
                <img src={capsule.image.thumbUrl} alt="Capsule photo" />
              </button>
            )}
            {fullUrl && <img className="photo-full" src={fullUrl} alt="Full size capsule photo" />}
          </>
        )}
        <div className="memory-dialog-actions">
          {capsule.canOpen && (
            <button
              type="button"
              className="primary-button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const opened = await openCapsule(capsule.id);
                setPending(false);
                if (opened.error) setError(opened.error);
                else router.refresh();
              }}
            >
              {pending ? "Opening…" : "Open capsule"}
            </button>
          )}
          {capsule.isCreator && !capsule.openedAt && (
            <button
              type="button"
              className="text-button danger-button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const removed = await deleteCapsule(capsule.id);
                if (removed.error) {
                  setError(removed.error);
                  setPending(false);
                } else onClose();
              }}
            >
              Remove sealed capsule
            </button>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </article>
    </dialog>
  );
}
