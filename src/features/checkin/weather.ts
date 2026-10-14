import { isCheckinMood, type CheckinMood } from "./moods";

export type SkyWeather = "quiet" | "warm" | "clear" | "rain" | "restless" | "still" | "tender";
export type DuckPose = "look" | "bounce" | "glide" | "droop" | "fidget" | "rest" | "lean";

export type CoupleSky = {
  tints: SkyWeather[];
  poses: DuckPose[];
};

const WEATHER: Record<CheckinMood, SkyWeather> = {
  happy: "warm",
  excited: "warm",
  calm: "clear",
  sad: "rain",
  stressed: "restless",
  tired: "still",
  need_space: "still",
  miss_you: "tender",
};

const POSE: Record<CheckinMood, DuckPose> = {
  happy: "bounce",
  excited: "bounce",
  calm: "glide",
  sad: "droop",
  stressed: "fidget",
  tired: "rest",
  need_space: "rest",
  miss_you: "lean",
};

export const SKY_TINT: Record<SkyWeather, string | null> = {
  quiet: null,
  warm: "rgba(255, 168, 96, 0.13)",
  clear: "rgba(150, 210, 255, 0.06)",
  rain: "rgba(96, 128, 196, 0.2)",
  restless: "rgba(190, 120, 255, 0.08)",
  still: "rgba(20, 14, 48, 0.18)",
  tender: "rgba(255, 128, 176, 0.13)",
};

/** Both of today's moods shape the sky. Matching moods share one pose; different moods alternate. */
export function skyFromMoods(moods: string[]): CoupleSky {
  const known = [...new Set(moods.filter(isCheckinMood))];
  if (known.length === 0) return { tints: ["quiet"], poses: ["look"] };
  return {
    tints: known.map((mood) => WEATHER[mood]),
    poses: known.map((mood) => POSE[mood]),
  };
}
