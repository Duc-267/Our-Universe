"use client";

import { useState } from "react";
import { MAX_ORIGINAL_BYTES } from "@/features/media/prepare";

export type ExistingPhoto = { id: string; thumbUrl: string };

export function PhotoField({
  files,
  onFiles,
  existing = [],
  onRemoveExisting,
  multiple = true,
  max = 6,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  existing?: ExistingPhoto[];
  onRemoveExisting?: (id: string) => void;
  multiple?: boolean;
  max?: number;
}) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const remaining = max - existing.length - files.length;

  function replaceFiles(next: File[]) {
    setPreviews((current) => {
      const kept = current.filter((preview) => next.includes(preview.file));
      const keptFiles = new Set(kept.map((preview) => preview.file));
      for (const preview of current) {
        if (!keptFiles.has(preview.file)) URL.revokeObjectURL(preview.url);
      }
      const added = next
        .filter((file) => !keptFiles.has(file))
        .map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...kept, ...added];
    });
    onFiles(next);
  }

  return (
    <div className="photo-field">
      <label htmlFor="photos">
        {max > 1 ? "Photos" : "Photo"} <span className="optional">(optional{max > 1 ? `, up to ${max}` : ""})</span>
      </label>
      <input
        id="photos"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple={multiple}
        disabled={remaining <= 0}
        onChange={(event) => {
          const picked = [...(event.target.files ?? [])];
          event.target.value = "";
          const accepted: File[] = [];
          let rejected = false;
          for (const file of picked.slice(0, Math.max(0, remaining))) {
            if (file.size > MAX_ORIGINAL_BYTES) rejected = true;
            else accepted.push(file);
          }
          setNotice(rejected ? "Photos must be 20 MB or smaller." : null);
          const next = multiple ? [...files, ...accepted].slice(0, max - existing.length) : accepted.slice(0, 1);
          replaceFiles(next);
        }}
      />
      <p className="field-help">JPEG, PNG, WebP, or HEIC. Each photo is resized before it is saved.</p>
      {(existing.length > 0 || previews.length > 0) && (
        <ul className="photo-grid">
          {existing.map((photo) => (
            <li key={photo.id}>
              <img src={photo.thumbUrl} alt="" />
              {onRemoveExisting && (
                <button type="button" onClick={() => onRemoveExisting(photo.id)}>Remove</button>
              )}
            </li>
          ))}
          {previews.map((preview) => (
            <li key={preview.url}>
              <img src={preview.url} alt="" />
              <button
                type="button"
                onClick={() => replaceFiles(files.filter((file) => file !== preview.file))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p className="form-error" role="alert">{notice}</p>}
    </div>
  );
}
