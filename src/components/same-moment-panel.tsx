"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { startSameMoment } from "@/features/same-moment/actions";
import { preparePhoto } from "@/features/media/prepare";
import { uploadSameMoment } from "@/features/media/upload";
import { createClient } from "@/lib/supabase/client";
import { PhotoField } from "./photo-field";

export type SameMomentSubmission = {
  authorUserId: string;
  authorName: string;
  isMine: boolean;
  caption: string | null;
  thumbUrl: string | null;
  fullPath: string | null;
};

export type SameMomentRow = {
  id: string;
  status: "open" | "complete" | "incomplete";
  blind: boolean;
  createdAt: string;
  windowEndsAt: string;
  completedAt: string | null;
  createdByName: string;
  mineSubmitted: boolean;
  submissions: SameMomentSubmission[];
  twins: {
    positionX: number;
    positionY: number;
    positionZ: number;
    scale: number;
    rotation: number;
    visualSeed: number;
    slot: number;
  }[];
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SameMomentPanel({
  coupleId,
  userId,
  moments,
  selectedId,
  onSelect,
}: {
  coupleId: string;
  userId: string;
  moments: SameMomentRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const router = useRouter();
  const open = moments.find((moment) => moment.status === "open") ?? null;
  const history = moments.filter((moment) => moment.status !== "open");
  const [blind, setBlind] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onStart() {
    setPending(true);
    setError(null);
    const started = await startSameMoment(blind);
    setPending(false);
    if (started.error) setError(started.error);
    else router.refresh();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!open || !files[0]) {
      setError("Add one photo to share this moment.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const prepared = await preparePhoto(files[0]);
      await uploadSameMoment(createClient(), coupleId, open.id, userId, prepared, caption);
      setFiles([]);
      setCaption("");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not share this moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="same-moment-panel" aria-labelledby="same-moment-heading">
      <div className="same-moment-card">
        <h2 id="same-moment-heading">Same Moment</h2>
        <p className="same-moment-copy">Share what each of you is seeing, roughly now.</p>
        {!open ? (
          <div className="same-moment-start">
            <label className="same-moment-blind">
              <input type="checkbox" checked={blind} onChange={(event) => setBlind(event.target.checked)} />
              Blind mode — hide photos until both of you submit
            </label>
            <button type="button" className="primary-button" disabled={pending} onClick={onStart}>
              {pending ? "Starting…" : "Start Same Moment"}
            </button>
          </div>
        ) : (
          <div className="same-moment-open">
            <p className="same-moment-window">
              Open until {formatWhen(open.windowEndsAt)}
              {open.blind ? " · blind" : " · open"}
            </p>
            <button type="button" className="text-button" onClick={() => onSelect(open.id)}>
              View invitation
            </button>
            {!open.mineSubmitted ? (
              <form onSubmit={onSubmit} className="form-stack same-moment-submit">
                <PhotoField files={files} onFiles={setFiles} multiple={false} max={1} />
                <label htmlFor="same-moment-caption">Caption <span className="optional">(optional)</span></label>
                <input
                  id="same-moment-caption"
                  maxLength={280}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="A few words about this moment"
                />
                <button className="primary-button" type="submit" disabled={pending}>
                  {pending ? "Sharing…" : "Share my side"}
                </button>
              </form>
            ) : (
              <p className="same-moment-waiting">
                You already shared. Waiting for your partner{open.submissions.length > 1 ? "." : "."}
              </p>
            )}
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      {history.length > 0 && (
        <details className="same-moment-history" open={Boolean(selectedId)}>
          <summary>Earlier Same Moments</summary>
          <ul>
            {history.map((moment) => (
              <li key={moment.id}>
                <button
                  type="button"
                  className="same-moment-history-item"
                  aria-current={moment.id === selectedId ? "true" : undefined}
                  onClick={() => onSelect(moment.id)}
                >
                  <span>{formatWhen(moment.createdAt)}</span>
                  <span>
                    {moment.status === "complete"
                      ? "Twin stars"
                      : "Incomplete"}
                    {moment.blind ? " · blind" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function SameMomentDialog({
  moment,
  onClose,
}: {
  moment: SameMomentRow;
  onClose: () => void;
}) {
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  return (
    <dialog className="memory-dialog" open aria-labelledby="same-moment-dialog-title" onClose={onClose}>
      <article className="memory-dialog-body">
        <div className="memory-dialog-head">
          <h2 id="same-moment-dialog-title">
            {moment.status === "complete" ? "Twin stars" : moment.status === "open" ? "Same Moment" : "Incomplete moment"}
          </h2>
          <button type="button" className="text-button" onClick={onClose}>Close</button>
        </div>
        <p className="memory-dialog-meta">
          Started by {moment.createdByName} · {formatWhen(moment.createdAt)}
          {moment.blind ? " · blind" : ""}
        </p>
        {moment.status === "incomplete" && (
          <p className="memory-dialog-description">Only one of you shared before the window closed.</p>
        )}
        <ul className="same-moment-pair">
          {moment.submissions.map((submission) => (
            <li key={submission.authorUserId}>
              <p className="same-moment-who">{submission.isMine ? "You" : submission.authorName}</p>
              {submission.thumbUrl ? (
                <button
                  type="button"
                  className="photo-open"
                  onClick={async () => {
                    if (!submission.fullPath) return;
                    const { data } = await createClient()
                      .storage.from("universe-media")
                      .createSignedUrl(submission.fullPath, 120);
                    if (data?.signedUrl) setFullUrl(data.signedUrl);
                  }}
                >
                  <img src={submission.thumbUrl} alt="" />
                </button>
              ) : (
                <p className="same-moment-hidden">Hidden until you share your side.</p>
              )}
              {submission.caption && <p className="same-moment-caption">{submission.caption}</p>}
            </li>
          ))}
          {moment.status !== "complete" && moment.submissions.length < 2 && (
            <li>
              <p className="same-moment-who">Waiting</p>
              <p className="same-moment-hidden">No second photo yet.</p>
            </li>
          )}
        </ul>
        {fullUrl && (
          <div className="photo-full-wrap">
            <button type="button" className="text-button" onClick={() => setFullUrl(null)}>Close photo</button>
            <img className="photo-full" src={fullUrl} alt="Same Moment photo" />
          </div>
        )}
      </article>
    </dialog>
  );
}
