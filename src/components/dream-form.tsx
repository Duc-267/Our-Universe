"use client";

import { useState, type FormEvent } from "react";
import { createDream } from "@/features/dream/actions";
import { MEMORY_CATEGORIES } from "@/features/memory/categories";

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function DreamForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createDream(new FormData(event.currentTarget));
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label htmlFor="title">Title</label>
      <input id="title" name="title" required maxLength={120} placeholder="See the aurora" />

      <label htmlFor="description">
        Description <span className="optional">(optional)</span>
      </label>
      <textarea id="description" name="description" maxLength={2000} rows={4} placeholder="What we hope this will feel like" />

      <label htmlFor="target_date">
        Target date <span className="optional">(optional)</span>
      </label>
      <input id="target_date" name="target_date" type="date" />

      <label htmlFor="category">Category</label>
      <select id="category" name="category" defaultValue="special">
        {MEMORY_CATEGORIES.map((choice) => (
          <option key={choice} value={choice}>{categoryLabel(choice)}</option>
        ))}
      </select>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save dream"}
      </button>
    </form>
  );
}
