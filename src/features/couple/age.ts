export type RelationshipAge = {
  daysTogether: number;
  yearsTogether: number;
  nextAnniversary: { date: string; daysAway: number; number: number } | null;
};

/**
 * Today's calendar date inside the given IANA timezone, as YYYY-MM-DD.
 * Falls back to UTC when the stored timezone is unknown to this runtime.
 */
export function todayInZone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000,
  );
}

function anniversaryDate(year: number, month: number, day: number): string {
  // Clamp to the month length so a Feb 29 start lands on Feb 28 in non-leap years.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function computeRelationshipAge(
  relationshipStartDate: string,
  timezone: string,
): RelationshipAge {
  const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(relationshipStartDate);
  if (!startMatch) {
    return { daysTogether: 0, yearsTogether: 0, nextAnniversary: null };
  }
  const startYear = Number(startMatch[1]);
  const startMonth = Number(startMatch[2]);
  const startDay = Number(startMatch[3]);
  const today = todayInZone(timezone);

  const daysTogether = Math.max(0, daysBetween(relationshipStartDate, today));
  const todayYear = Number(today.slice(0, 4));
  let nextAnniversary: RelationshipAge["nextAnniversary"] = null;
  for (let year = todayYear; year <= todayYear + 1; year += 1) {
    const date = anniversaryDate(year, startMonth, startDay);
    if (date >= today) {
      nextAnniversary = {
        date,
        daysAway: daysBetween(today, date),
        number: year - startYear,
      };
      break;
    }
  }

  const yearsTogether =
    nextAnniversary === null
      ? 0
      : nextAnniversary.daysAway === 0
        ? nextAnniversary.number
        : Math.max(0, nextAnniversary.number - 1);

  return { daysTogether, yearsTogether, nextAnniversary };
}
