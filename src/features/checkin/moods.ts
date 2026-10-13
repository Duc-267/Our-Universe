export const CHECKIN_MOODS = [
  "happy",
  "calm",
  "tired",
  "stressed",
  "sad",
  "excited",
  "need_space",
  "miss_you",
] as const;

export type CheckinMood = (typeof CHECKIN_MOODS)[number];

const LABELS: Record<CheckinMood, string> = {
  happy: "Happy",
  calm: "Calm",
  tired: "Tired",
  stressed: "Stressed",
  sad: "Sad",
  excited: "Excited",
  need_space: "Need space",
  miss_you: "Miss you",
};

export function isCheckinMood(value: string): value is CheckinMood {
  return (CHECKIN_MOODS as readonly string[]).includes(value);
}

export function moodLabel(mood: string): string {
  return isCheckinMood(mood) ? LABELS[mood] : mood;
}
