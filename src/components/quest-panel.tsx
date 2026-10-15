"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { startQuest } from "@/features/quest/actions";
import { QUEST_TEMPLATES, rewardLabel, type QuestRewardKind, type QuestResponseType } from "@/features/quest/catalog";
import { preparePhoto } from "@/features/media/prepare";
import { submitQuestResponse } from "@/features/media/upload";
import { createClient } from "@/lib/supabase/client";
import { PhotoField } from "./photo-field";

export type QuestSubmission = {
  authorUserId: string;
  authorName: string;
  isMine: boolean;
  body: string | null;
  thumbUrl: string | null;
  fullPath: string | null;
};

export type QuestRow = {
  id: string;
  title: string;
  instructions: string;
  responseType: QuestResponseType;
  rewardKind: QuestRewardKind;
  status: "open" | "complete" | "incomplete";
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
  createdByName: string;
  mineSubmitted: boolean;
  submissions: QuestSubmission[];
  reward: {
    positionX: number;
    positionY: number;
    positionZ: number;
    scale: number;
    rotation: number;
    visualSeed: number;
  } | null;
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function QuestPanel({
  coupleId,
  userId,
  quests,
  selectedId,
  onSelect,
}: {
  coupleId: string;
  userId: string;
  quests: QuestRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const router = useRouter();
  const open = quests.find((quest) => quest.status === "open") ?? null;
  const history = quests.filter((quest) => quest.status !== "open");
  const [templateKey, setTemplateKey] = useState(QUEST_TEMPLATES[0]?.key ?? "photograph_sky");
  const [files, setFiles] = useState<File[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onStart() {
    setPending(true);
    setError(null);
    const started = await startQuest(templateKey);
    setPending(false);
    if (started.error) setError(started.error);
    else router.refresh();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!open) return;
    const needsPhoto = open.responseType === "photo" || open.responseType === "photo_text";
    const needsText = open.responseType === "text" || open.responseType === "photo_text";
    if (needsPhoto && !files[0]) {
      setError("Add one photo for this quest.");
      return;
    }
    if (needsText && !body.trim()) {
      setError("Write a short response for this quest.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const photo = needsPhoto && files[0] ? await preparePhoto(files[0]) : null;
      await submitQuestResponse(
        createClient(),
        coupleId,
        open.id,
        userId,
        needsText ? body.trim() : null,
        photo,
      );
      setFiles([]);
      setBody("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this quest.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="quest-panel" aria-labelledby="quest-heading">
      <div className="quest-card">
        <h2 id="quest-heading">Quests</h2>
        <p className="quest-copy">A shared prompt, two responses, one cosmic reward.</p>
        {!open ? (
          <div className="quest-start">
            <label htmlFor="quest-template">Choose a quest</label>
            <select
              id="quest-template"
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
            >
              {QUEST_TEMPLATES.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.title}
                </option>
              ))}
            </select>
            <p className="quest-hint">
              {QUEST_TEMPLATES.find((template) => template.key === templateKey)?.instructions}
            </p>
            <button type="button" className="primary-button" disabled={pending} onClick={onStart}>
              {pending ? "Starting…" : "Start quest"}
            </button>
          </div>
        ) : (
          <div className="quest-open">
            <h3 className="quest-open-title">{open.title}</h3>
            <p className="quest-hint">{open.instructions}</p>
            <p className="quest-window">Open until {formatWhen(open.expiresAt)}</p>
            <button type="button" className="text-button" onClick={() => onSelect(open.id)}>
              View quest
            </button>
            {!open.mineSubmitted ? (
              <form onSubmit={onSubmit} className="form-stack quest-submit">
                {(open.responseType === "photo" || open.responseType === "photo_text") && (
                  <PhotoField files={files} onFiles={setFiles} multiple={false} max={1} />
                )}
                {(open.responseType === "text" || open.responseType === "photo_text") && (
                  <>
                    <label htmlFor="quest-body">Your response</label>
                    <input
                      id="quest-body"
                      maxLength={280}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="A few words"
                    />
                  </>
                )}
                <button className="primary-button" type="submit" disabled={pending}>
                  {pending ? "Sending…" : "Submit my side"}
                </button>
              </form>
            ) : (
              <p className="quest-waiting">You already answered. Waiting for your partner.</p>
            )}
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      {history.length > 0 && (
        <details className="quest-history">
          <summary>Recent quests</summary>
          <ul>
            {history.map((quest) => (
              <li key={quest.id}>
                <button type="button" className="text-button" onClick={() => onSelect(quest.id)}>
                  {quest.title}
                  {" · "}
                  {quest.status === "complete"
                    ? rewardLabel(quest.rewardKind)
                    : "Incomplete"}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function QuestDialog({
  quest,
  onClose,
}: {
  quest: QuestRow;
  onClose: () => void;
}) {
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
          <h2>{quest.title}</h2>
        </div>
        <p className="memory-dialog-meta">
          {quest.status === "complete"
            ? `Completed · ${rewardLabel(quest.rewardKind)}`
            : quest.status === "open"
              ? `Open until ${formatWhen(quest.expiresAt)}`
              : "Incomplete"}
        </p>
        <p className="memory-dialog-description">{quest.instructions}</p>
        <ul className="quest-response-list">
          {quest.submissions.map((submission) => (
            <li key={submission.authorUserId} className="quest-response">
              <p className="quest-response-who">{submission.isMine ? "You" : submission.authorName}</p>
              {submission.body && <p className="quest-response-body">{submission.body}</p>}
              {submission.thumbUrl && (
                <img className="quest-response-thumb" src={submission.thumbUrl} alt="" />
              )}
            </li>
          ))}
          {quest.status === "incomplete" && quest.submissions.length < 2 && (
            <li className="quest-response is-missing">
              <p className="quest-response-who">Partner</p>
              <p className="quest-response-body">No response before the window closed.</p>
            </li>
          )}
        </ul>
        <div className="memory-dialog-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
