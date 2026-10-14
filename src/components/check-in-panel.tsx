"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveCheckin } from "@/features/checkin/actions";
import { CHECKIN_MOODS, moodEmoji, moodLabel } from "@/features/checkin/moods";
import { preparePhoto } from "@/features/media/prepare";
import { uploadCheckinPhoto } from "@/features/media/upload";
import { createClient } from "@/lib/supabase/client";
import { PhotoField } from "./photo-field";

export type CheckinRow = {
  id: string;
  authorUserId: string;
  authorName: string;
  localDate: string;
  mood: string;
  note: string | null;
  isMine: boolean;
  thumbUrl: string | null;
  fullPath: string | null;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function CheckInPanel({
  coupleId,
  today,
  checkins,
}: {
  coupleId: string;
  today: string;
  checkins: CheckinRow[];
}) {
  const router = useRouter();
  const todays = checkins.filter((row) => row.localDate === today);
  const mine = todays.find((row) => row.isMine) ?? null;
  const partner = todays.find((row) => !row.isMine) ?? null;
  const earlier = checkins.filter((row) => row.localDate !== today).slice(0, 12);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const saved = await saveCheckin({ error: null, checkinId: null }, new FormData(event.currentTarget));
    if (saved.error || !saved.checkinId) {
      setError(saved.error ?? "Could not save today's check-in.");
      setPending(false);
      return;
    }
    if (files[0]) {
      try {
        const prepared = await preparePhoto(files[0]);
        await uploadCheckinPhoto(createClient(), coupleId, saved.checkinId, prepared);
        setFiles([]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not attach this photo.");
        setPending(false);
        return;
      }
    }
    setPending(false);
    router.refresh();
  }

  return (
    <section className="checkin-panel" aria-labelledby="checkin-heading">
      <div className="checkin-today">
        <h2 id="checkin-heading">How is today?</h2>
        <div className="checkin-pair">
          <div className="checkin-person">
            <span className="checkin-face" aria-hidden="true">{mine ? moodEmoji(mine.mood) : "·"}</span>
            <span className="checkin-who">You</span>
            <span className="checkin-mood">{mine ? moodLabel(mine.mood) : "Not yet"}</span>
            {mine?.thumbUrl && (
              <button
                type="button"
                className="checkin-photo"
                onClick={async () => {
                  if (!mine.fullPath) return;
                  const { data } = await createClient().storage.from("universe-media").createSignedUrl(mine.fullPath, 120);
                  if (data?.signedUrl) setFullUrl(data.signedUrl);
                }}
              >
                <img src={mine.thumbUrl} alt="Your check-in photo" />
              </button>
            )}
          </div>
          <span className="checkin-link" aria-hidden="true">♥</span>
          <div className="checkin-person">
            <span className="checkin-face" aria-hidden="true">{partner ? moodEmoji(partner.mood) : "·"}</span>
            <span className="checkin-who">{partner?.authorName ?? "Your partner"}</span>
            <span className="checkin-mood">{partner ? moodLabel(partner.mood) : "Not yet"}</span>
            {partner?.thumbUrl && (
              <button
                type="button"
                className="checkin-photo"
                onClick={async () => {
                  if (!partner.fullPath) return;
                  const { data } = await createClient().storage.from("universe-media").createSignedUrl(partner.fullPath, 120);
                  if (data?.signedUrl) setFullUrl(data.signedUrl);
                }}
              >
                <img src={partner.thumbUrl} alt="Partner check-in photo" />
              </button>
            )}
          </div>
        </div>
        {partner?.note && <p className="checkin-partner">“{partner.note}”</p>}
        <form key={`${mine?.mood ?? "new"}:${mine?.note ?? ""}:${mine?.thumbUrl ?? ""}`} onSubmit={onSubmit} className="checkin-form">
          <fieldset className="mood-picker">
            <legend className="sr-only">Mood</legend>
            {CHECKIN_MOODS.map((mood) => (
              <label key={mood} className="mood-option">
                <input type="radio" name="mood" value={mood} defaultChecked={mine?.mood === mood} required />
                <span><span aria-hidden="true">{moodEmoji(mood)}</span> {moodLabel(mood)}</span>
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
          <PhotoField files={files} onFiles={setFiles} multiple={false} max={1} />
          <button className="primary-button checkin-save" type="submit" disabled={pending}>
            {pending ? "Saving…" : mine ? "Update today" : "Share today"}
          </button>
        </form>
        {(error) && <p className="form-error" role="alert">{error}</p>}
        {fullUrl && (
          <div className="photo-full-wrap">
            <button type="button" className="text-button" onClick={() => setFullUrl(null)}>Close photo</button>
            <img className="photo-full" src={fullUrl} alt="Check-in photo" />
          </div>
        )}
      </div>
      {earlier.length > 0 && (
        <details className="checkin-history">
          <summary>Earlier check-ins</summary>
          <ul>
            {earlier.map((row) => (
              <li key={row.id}>
                <span>{formatDate(row.localDate)}</span>
                <span>{row.authorName} · <span aria-hidden="true">{moodEmoji(row.mood)}</span> {moodLabel(row.mood)}</span>
                {row.note && <span className="checkin-note">{row.note}</span>}
                {row.thumbUrl && <img className="checkin-history-thumb" src={row.thumbUrl} alt="" />}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
