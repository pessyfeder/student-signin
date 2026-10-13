export type Tone = "morning" | "recess" | "lunch";

export type Period = {
  id: string;
  greet: string;
  frame: string;
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
};

export const STUDENTS = ["Hindy Fisch", "Mindy Katina", "Esty Oberlander"];

// minutes since midnight
export const PERIODS: Period[] = [
  { id: "arrival", greet: "Good Morning", frame: "Good Morning", tone: "morning", start: 600, end: 615 },
  { id: "recess", greet: "Good day", frame: "After Recess", tone: "recess", start: 688, end: 693 },
  { id: "lunch", greet: "Good Afternoon", frame: "After Lunch", tone: "lunch", start: 805, end: 805 },
];

export const TONES: { [k in Tone]: { wash: string; badge: string; clock: string; bubble: string } } = {
  morning: { wash: "wash-morning", badge: "grad-morning glow-morning", clock: "text-clock-morning", bubble: "grad-morning" },
  recess: { wash: "wash-recess", badge: "grad-recess glow-recess", clock: "text-clock-recess", bubble: "grad-recess" },
  lunch: { wash: "wash-lunch", badge: "grad-lunch glow-lunch", clock: "text-clock-lunch", bubble: "grad-lunch" },
};

export const mins = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

export function currentPeriod(now: number) {
  let p = PERIODS[0]!;
  for (const x of PERIODS) if (now >= x.start) p = x;
  return p;
}

export function fmt(m: number) {
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
  return `${h > 12 ? h - 12 : h}:${mm}`;
}

export const clockLabel = (d: Date) =>
  d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export async function hashPassword(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
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
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
