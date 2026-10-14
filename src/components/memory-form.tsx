"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createMemory, deleteMemoryPhoto, updateMemory } from "@/features/memory/actions";
import { MEMORY_CATEGORIES } from "@/features/memory/categories";
import { iconForCategory, isMemoryIcon, MEMORY_ICONS, memoryIcon } from "@/features/memory/icons";
import { preparePhoto } from "@/features/media/prepare";
import { uploadMemoryPhoto } from "@/features/media/upload";
import { createClient } from "@/lib/supabase/client";
import { PhotoField, type ExistingPhoto } from "./photo-field";

const IMPORTANCE_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type MemoryFormValues = {
  id?: string;
  title?: string;
  memoryDate?: string;
  description?: string | null;
  locationText?: string | null;
  category?: string;
  importance?: number;
  icon?: string;
};

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function MemoryForm({
  mode,
  coupleId,
  memory,
  defaultDate,
  existingPhotos = [],
}: {
  mode: "create" | "edit";
  coupleId: string;
  memory?: MemoryFormValues;
  defaultDate?: string;
  existingPhotos?: ExistingPhoto[];
}) {
  const router = useRouter();
  const initialCategory = memory?.category ?? "everyday";
  const [category, setCategory] = useState(initialCategory);
  const [icon, setIcon] = useState(
    memory?.icon && isMemoryIcon(memory.icon) ? memory.icon : iconForCategory(initialCategory),
  );
  const [iconTouched, setIconTouched] = useState(Boolean(memory?.icon));
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState(existingPhotos);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const save = mode === "create" ? createMemory : updateMemory;
    const saved = await save({ error: null, memoryId: null }, new FormData(event.currentTarget));
    if (saved.error || !saved.memoryId) {
      setError(saved.error ?? "Could not save this memory.");
      setPending(false);
      return;
    }
    const failures: string[] = [];
    for (const file of files) {
      try {
        const prepared = await preparePhoto(file);
        await uploadMemoryPhoto(createClient(), coupleId, saved.memoryId, prepared);
      } catch (uploadError) {
        failures.push(uploadError instanceof Error ? uploadError.message : "Could not attach a photo.");
      }
    }
    if (failures.length > 0) {
      setError(`The memory was saved. ${failures[0]}`);
      setPending(false);
      return;
    }
    router.push(`/universe?star=${saved.memoryId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-stack">
      {mode === "edit" && memory?.id && (
        <input type="hidden" name="memory_id" value={memory.id} />
      )}
      <label htmlFor="title">Title</label>
      <input id="title" name="title" maxLength={120} required defaultValue={memory?.title ?? ""} />
      <label htmlFor="memory_date">Date</label>
      <input
        id="memory_date"
        name="memory_date"
        type="date"
        required
        defaultValue={memory?.memoryDate ?? defaultDate}
      />
      <label htmlFor="description">
        Description <span className="optional">(optional)</span>
      </label>
      <textarea
        id="description"
        name="description"
        rows={5}
        maxLength={2000}
        defaultValue={memory?.description ?? ""}
      />
      <label htmlFor="location_text">
        Location <span className="optional">(optional)</span>
      </label>
      <input
        id="location_text"
        name="location_text"
        maxLength={120}
        defaultValue={memory?.locationText ?? ""}
      />
      <label htmlFor="category">Category</label>
      <select
        id="category"
        name="category"
        value={category}
        onChange={(event) => {
          const next = event.target.value;
          setCategory(next);
          if (!iconTouched) setIcon(iconForCategory(next));
        }}
      >
        {MEMORY_CATEGORIES.map((choice) => (
          <option key={choice} value={choice}>{categoryLabel(choice)}</option>
        ))}
      </select>
      <fieldset className="icon-picker">
        <legend>Star icon</legend>
        <input type="hidden" name="icon" value={icon} />
        {MEMORY_ICONS.map((choice) => (
          <button
            key={choice.id}
            type="button"
            aria-pressed={icon === choice.id}
            aria-label={choice.label}
            onClick={() => {
              setIcon(choice.id);
              setIconTouched(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={choice.d} fill="currentColor" fillRule={choice.evenodd ? "evenodd" : "nonzero"} />
            </svg>
          </button>
        ))}
      </fieldset>
      <p className="field-help">The chosen icon is the shape of this memory’s star. {memoryIcon(icon).label} is selected.</p>
      <label htmlFor="importance">Importance</label>
      <select id="importance" name="importance" defaultValue={String(memory?.importance ?? 5)}>
        {IMPORTANCE_CHOICES.map((choice) => (
          <option key={choice} value={choice}>{choice}</option>
        ))}
      </select>
      <p className="field-help">Memories marked 8 or higher shine as bright stars.</p>
      <PhotoField
        files={files}
        onFiles={setFiles}
        existing={photos}
        max={6}
        onRemoveExisting={async (photoId) => {
          const removed = await deleteMemoryPhoto(photoId);
          if (removed.error) {
            setError(removed.error);
            return;
          }
          setPhotos((current) => current.filter((photo) => photo.id !== photoId));
        }}
      />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Save memory" : "Save changes"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
