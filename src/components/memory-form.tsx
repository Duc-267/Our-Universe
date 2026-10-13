"use client";

import { useActionState, useState } from "react";
import { createMemory, updateMemory, type MemoryFormState } from "@/features/memory/actions";
import { MEMORY_CATEGORIES } from "@/features/memory/categories";
import { iconForCategory, isMemoryIcon, MEMORY_ICONS, memoryIcon } from "@/features/memory/icons";

const initialState: MemoryFormState = { error: null };
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
  memory,
  defaultDate,
}: {
  mode: "create" | "edit";
  memory?: MemoryFormValues;
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createMemory : updateMemory,
    initialState,
  );
  const initialCategory = memory?.category ?? "everyday";
  const [category, setCategory] = useState(initialCategory);
  const [icon, setIcon] = useState(
    memory?.icon && isMemoryIcon(memory.icon) ? memory.icon : iconForCategory(initialCategory),
  );
  const [iconTouched, setIconTouched] = useState(Boolean(memory?.icon));

  return (
    <form action={formAction} className="form-stack">
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
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Save memory" : "Save changes"}
      </button>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}
