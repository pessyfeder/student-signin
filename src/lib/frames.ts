export type Tone = "morning" | "recess" | "lunch";

export type Period = {
  id: string;
  greet: string;
  frame: string;
  emoji: string;
  tone: Tone;
  start: number;
  end: number;
};

export type Status = "early" | "ontime" | "late";

export type SignIn = {
  text: string;
  late: boolean;
  at?: string;
  status?: Status;
  greet?: string;
  name?: string;
  detail?: string;
};

export const STUDENTS = ["Hindy Fisch", "Mindy Katina", "Esty Oberlander"];

// minutes since midnight
export const PERIODS: Period[] = [
  {
    id: "arrival",
    greet: "Good Morning",
    frame: "Good Morning",
    emoji: "☀️",
    tone: "morning",
    start: 600,
    end: 615,
  },
  {
    id: "recess",
    greet: "Good day",
    frame: "After Recess",
    emoji: "⚽",
    tone: "recess",
    start: 688,
    end: 693,
  },
  {
    id: "lunch",
    greet: "Good Afternoon",
    frame: "After Lunch",
    emoji: "🍎",
    tone: "lunch",
    start: 805,
    end: 810,
  },
];

export const TONES: { [k in Tone]: { chip: string } } = {
  morning: { chip: "bg-morning text-morning-ink" },
  recess: { chip: "bg-recess text-recess-ink" },
  lunch: { chip: "bg-lunch text-lunch-ink" },
};

export const mins = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

// End of the school day: sign-in closes for good (minutes since midnight, 3:00 PM).
export const DAY_END = 900;

// The window currently open for sign-in: the latest one that has started.
// Before the first window starts, or from the end of the school day, there is none.
export function currentPeriod(now: number): Period | null {
  if (now >= DAY_END) return null;
  let p: Period | null = null;
  for (const x of PERIODS) if (now >= x.start) p = x;
  return p;
}

export function nextPeriod(now: number): Period | null {
  return PERIODS.find((x) => x.start > now) ?? null;
}

export type Result = { status: Status; minutes: number; late: boolean; detail: string };

// On time = from the window start through the cutoff minute. Within the window,
// "early" means whole minutes remaining before the cutoff; after it, sign-in is late.
export function evaluateSignIn(period: Period, now: number): Result {
  if (now > period.end + 1 / 60) {
    const minutes = Math.max(1, Math.ceil(now - period.end));
    return { status: "late", minutes, late: true, detail: `You signed in ${minutes} min late` };
  }
  const minutes = Math.floor(period.end - now);
  if (minutes < 1)
    return { status: "ontime", minutes: 0, late: false, detail: "You signed in right on time" };
  return { status: "early", minutes, late: false, detail: `You signed in ${minutes} min early` };
}

export const windowLabel = (p: Period) => `${fmt(p.start)} → ${fmt(p.end)}`;

// Hand angles in degrees (0 = 12 o'clock, clockwise) for a time in minutes since midnight.
// Fractional minutes move the hour and minute hands smoothly; the second hand follows the seconds.
export function handAngles(m: number) {
  return {
    hour: ((m / 60) % 12) * 30,
    minute: (m % 60) * 6,
    second: (Math.round((m * 60) % 60) * 6) % 360,
  };
}

export function fmt(m: number) {
  const h = Math.floor(m / 60),
    mm = String(m % 60).padStart(2, "0");
  return `${h > 12 ? h - 12 : h}:${mm}`;
}

export const clockLabel = (d: Date) =>
  d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export async function hashPassword(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

const RECORDS_KEY = "signin-records";

export function loadRecords(): { [k: string]: SignIn } {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveRecords(r: { [k: string]: SignIn }) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(r));
}

export function recordStatus(rec: SignIn): Status {
  return rec.status ?? (rec.late ? "late" : "ontime");
}

export type AttendanceRow = { student: string; rec: SignIn | null };

export type AttendanceFrame = {
  period: Period;
  rows: AttendanceRow[];
  counts: { early: number; ontime: number; late: number; missing: number };
};

export type AttendanceDay = {
  day: string;
  frames: AttendanceFrame[];
  signedIn: number;
  total: number;
};

export function buildAttendance(records: { [k: string]: SignIn }): AttendanceDay[] {
  const days: string[] = [];
  for (const k of Object.keys(records)) {
    const d = k.split("|")[0] ?? "";
    if (d && !days.includes(d)) days.push(d);
  }
  days.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return days.map((day) => {
    const frames: AttendanceFrame[] = PERIODS.map((period) => {
      const rows: AttendanceRow[] = STUDENTS.map((student) => ({
        student,
        rec: records[`${day}|${period.id}|${student}`] ?? null,
      }));
      const counts = { early: 0, ontime: 0, late: 0, missing: 0 };
      for (const r of rows) {
        if (!r.rec) counts.missing += 1;
        else counts[recordStatus(r.rec)] += 1;
      }
      return { period, rows, counts };
    });
    const signedIn = frames.reduce((s, f) => s + f.rows.length - f.counts.missing, 0);
    const total = frames.reduce((s, f) => s + f.rows.length, 0);
    return { day, frames, signedIn, total };
  });
}

export function dayLabel(day: string) {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
