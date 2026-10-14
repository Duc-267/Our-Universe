export const STICKER_INK = "#2b1d3a";

export const CATEGORY_COLORS: Record<string, string> = {
  everyday: "#ffe2a8",
  date: "#ff8fab",
  trip: "#8fd3ff",
  funny: "#ffb38a",
  special: "#ffd23a",
  difficult: "#b9a8ff",
  random: "#9ee6b8",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.everyday;
}
