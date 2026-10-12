"use client";

import { useActionState } from "react";
import {
  createMemory,
  updateMemory,
  MEMORY_CATEGORIES,
  type MemoryFormState,
} from "@/features/memory/actions";

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
      <select id="category" name="category" defaultValue={memory?.category ?? "everyday"}>
        {MEMORY_CATEGORIES.map((category) => (
          <option key={category} value={category}>{categoryLabel(category)}</option>
        ))}
      </select>
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
