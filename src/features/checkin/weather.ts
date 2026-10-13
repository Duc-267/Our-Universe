import type { CheckinMood } from "./moods";

export type SkyWeather = "quiet" | "warm" | "clear" | "rain" | "restless" | "still" | "tender";

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

export function weatherFromMood(mood: string | null): SkyWeather {
  if (!mood || !(mood in WEATHER)) return "quiet";
  return WEATHER[mood as CheckinMood];
}
