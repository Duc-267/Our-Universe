"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createCapsule } from "@/features/capsule/actions";
import { preparePhoto } from "@/features/media/prepare";
import { uploadCapsuleImage } from "@/features/media/upload";
import { createClient } from "@/lib/supabase/client";
import { PhotoField } from "./photo-field";

export function CapsuleForm({ coupleId, today }: { coupleId: string; today: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 10);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const created = await createCapsule(new FormData(event.currentTarget));
    if (created.error || !created.capsuleId) {
      setError(created.error ?? "Could not seal this capsule.");
      setPending(false);
      return;
    }
    if (file[0]) {
      try {
        const prepared = await preparePhoto(file[0]);
        await uploadCapsuleImage(createClient(), coupleId, created.capsuleId, prepared);
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Could not attach this photo.";
        setError(`${message} The capsule was sealed without its image.`);
        setPending(false);
        return;
      }
    }
    router.push(`/universe?capsule=${created.capsuleId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label htmlFor="title">Title</label>
      <input id="title" name="title" maxLength={120} required />
      <label htmlFor="message">Message</label>
      <textarea id="message" name="message" rows={6} maxLength={4000} required />
      <label htmlFor="unlock_date">Unlock date</label>
      <input id="unlock_date" name="unlock_date" type="date" required min={minDate} />
      <p className="field-help">Your partner can see the capsule, but not this message, until that day.</p>
      <PhotoField files={file} onFiles={setFile} multiple={false} max={1} />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Sealing…" : "Seal capsule"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
