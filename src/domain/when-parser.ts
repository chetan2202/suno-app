// Natural-language time/date parsing for to-do tasks. Pure and browser-free.
//
// Extracts a due date/time from free text such as "papa, mujhe academy jana hai 6 PM
// today" (mixed Hindi/English). Rules (requirement R28):
//   - a time with no date defaults to today;
//   - an explicit date is used as given;
//   - a date with no time defaults to a morning hour;
//   - nothing recognised => no due (null), and the user can pick one manually.
//
// The task title is left as typed; only the due time is derived. Deliberately small: it
// covers the common phrasings a family uses, not every locale grammar.

export interface ParsedWhen {
  /** Parsed due time (epoch ms), or null when nothing was recognised. */
  dueAt: number | null;
  /** Whether a date and/or time expression was recognised (for UI hints). */
  hasDate: boolean;
  hasTime: boolean;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_DEFAULT_HOUR = 9; // date given but no time -> morning

type Period = "morning" | "afternoon" | "evening" | "night";
const PERIOD_HOUR: Record<Period, number> = { morning: 8, afternoon: 14, evening: 18, night: 20 };

function applyMeridiem(h: number, mer: string | undefined): number {
  if (!mer) return h;
  if (mer === "pm") return h === 12 ? 12 : h + 12;
  return h === 12 ? 0 : h; // am
}

function detectPeriod(s: string): Period | null {
  if (/\b(morning|subah)\b/.test(s)) return "morning";
  if (/\b(afternoon|dopahar)\b/.test(s)) return "afternoon";
  if (/\b(evening|shaam|sham)\b/.test(s)) return "evening";
  if (/\b(night|raat|tonight)\b/.test(s)) return "night";
  return null;
}

/** Resolve the date part; returns a Date at local midnight and whether a date was found. */
function detectDate(s: string, now: Date): { date: Date; found: boolean } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // dd/mm or dd-mm (optional year)
  const dmy = s.match(/\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = Number(dmy[2]) - 1;
    const yStr = dmy[3];
    const year = yStr ? (yStr.length === 2 ? 2000 + Number(yStr) : Number(yStr)) : now.getFullYear();
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) return { date: new Date(year, mon, day), found: true };
  }

  // "d month" or "month d"
  const mName = MONTHS.join("|");
  const dm = s.match(new RegExp(`\\b(\\d{1,2})\\s*(${mName})\\b`)) || s.match(new RegExp(`\\b(${mName})\\s*(\\d{1,2})\\b`));
  if (dm) {
    const g1 = dm[1] ?? "";
    const g2 = dm[2] ?? "";
    const day = Number(/\d/.test(g1) ? g1 : g2);
    const mon = MONTHS.indexOf((/[a-z]/.test(g1) ? g1 : g2).slice(0, 3));
    if (mon >= 0 && day >= 1 && day <= 31) {
      let year = now.getFullYear();
      const cand = new Date(year, mon, day);
      if (cand.getTime() < d.getTime()) year += 1; // a past month means next year
      return { date: new Date(year, mon, day), found: true };
    }
  }

  if (/\b(day after tomorrow|parso)\b/.test(s)) { d.setDate(d.getDate() + 2); return { date: d, found: true }; }
  if (/\b(tomorrow|kal)\b/.test(s)) { d.setDate(d.getDate() + 1); return { date: d, found: true }; }
  if (/\b(today|aaj|tonight)\b/.test(s)) return { date: d, found: true };

  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(s)) {
      const delta = (i - d.getDay() + 7) % 7 || 7; // the upcoming occurrence (not today)
      d.setDate(d.getDate() + delta);
      return { date: d, found: true };
    }
  }

  return { date: d, found: false };
}

/** Resolve the time part in hours/minutes, or null if none. */
function detectTime(s: string, period: Period | null): { h: number; m: number } | null {
  let h: number | null = null;
  let m = 0;
  let meridiemExplicit = false;

  let mt = s.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/);
  if (mt) {
    h = Number(mt[1]); m = Number(mt[2]);
    const mer = mt[3];
    if (mer) { h = applyMeridiem(h, mer); meridiemExplicit = true; }
  } else if ((mt = s.match(/\b(\d{1,2})\s*(am|pm)\b/))) {
    h = applyMeridiem(Number(mt[1]), mt[2]); meridiemExplicit = true;
  } else if ((mt = s.match(/\b(\d{1,2})\s*baje\b/))) {
    h = Number(mt[1]);
  }

  // A period word disambiguates a small clock hour (e.g. "shaam 6" -> 18:00).
  if (h !== null && !meridiemExplicit && period && period !== "morning" && h >= 1 && h <= 11) {
    h += 12;
  }
  // Period word with no explicit number sets a default hour ("subah" -> 08:00).
  if (h === null && period) h = PERIOD_HOUR[period];

  if (h === null) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

export function parseWhen(text: string, now: number = Date.now()): ParsedWhen {
  const s = ` ${text.toLowerCase()} `;
  const nowDate = new Date(now);
  const { date, found: hasDate } = detectDate(s, nowDate);
  const period = detectPeriod(s);
  const time = detectTime(s, period);
  const hasTime = time !== null;

  if (!hasTime && !hasDate) return { dueAt: null, hasDate, hasTime };

  const due = new Date(date);
  if (time) due.setHours(time.h, time.m, 0, 0);
  else due.setHours(DAY_DEFAULT_HOUR, 0, 0, 0);
  return { dueAt: due.getTime(), hasDate, hasTime };
}
