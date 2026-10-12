export const MEMORY_CATEGORIES = [
  "everyday",
  "date",
  "trip",
  "funny",
  "special",
  "difficult",
  "random",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
