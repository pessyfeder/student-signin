export type Tone = "morning" | "recess" | "recess2" | "lunch";

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

const STUDENTS_KEY = "signin-students";

// The class list: the built-in students plus any the teacher has added in this browser.
export function loadStudents(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDENTS_KEY) || "null");
    if (Array.isArray(saved) && saved.every((s) => typeof s === "string")) return saved;
  } catch {
    // fall through to the default list
  }
  return [...STUDENTS];
}

export function saveStudents(list: string[]) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(list));
}

// Returns the updated list, or an error message when the name is empty or already on the list.
export function addStudent(
  list: string[],
  raw: string,
  archived: string[] = [],
): { list: string[] } | { error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Please type a name" };
  if (list.some((s) => s.toLowerCase() === name.toLowerCase()))
    return { error: "That student is already on the list" };
  if (archived.some((s) => s.toLowerCase() === name.toLowerCase()))
    return { error: "That student is archived. Restore her from the archived list below" };
  return { list: [...list, name] };
}

const ARCHIVED_KEY = "signin-archived";

// Archived students: off the sign-in page and the attendance view, but their sign-ins are kept
// (they stay in the CSV and in backups) and she can be restored at any time.
export function loadArchived(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ARCHIVED_KEY) || "null");
    if (Array.isArray(saved) && saved.every((s) => typeof s === "string")) return saved;
  } catch {
    // fall through
  }
  return [];
}

export function saveArchived(list: string[]) {
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(list));
}

export function archiveStudent(students: string[], archived: string[], name: string) {
  return { students: students.filter((s) => s !== name), archived: [...archived, name] };
}

export function restoreStudent(students: string[], archived: string[], name: string) {
  return { students: [...students, name], archived: archived.filter((s) => s !== name) };
}

// First name only; add the surname initial if another student shares the first name,
// and the full name if the initial matches too.
export function displayName(name: string, all: string[] = STUDENTS) {
  const parts = (n: string) => {
    const [first = "", ...rest] = n.trim().split(/\s+/);
    return { first, initial: (rest[0] ?? "").charAt(0) };
  };
  const me = parts(name);
  const sameFirst = all
    .filter((n) => n !== name)
    .map(parts)
    .filter((o) => o.first.toLowerCase() === me.first.toLowerCase());
  if (sameFirst.length === 0) return me.first;
  if (sameFirst.some((o) => o.initial.toLowerCase() === me.initial.toLowerCase())) return name;
  return me.first + " " + me.initial + ".";
}

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
    frame: "After Yiddish Recess",
    emoji: "⚽",
    tone: "recess",
    start: 720,
    end: 725,
  },
  {
    id: "lunch",
    greet: "Good Afternoon",
    frame: "After Lunch",
    emoji: "🍎",
    tone: "lunch",
    start: 805,
    end: 812,
  },
  {
    id: "recess2",
    greet: "Good day",
    frame: "After English Recess",
    emoji: "🏀",
    tone: "recess2",
    start: 925,
    end: 930,
  },
];

export const TONES: { [k in Tone]: { chip: string } } = {
  morning: { chip: "bg-morning text-morning-ink" },
  recess: { chip: "bg-recess text-recess-ink" },
  recess2: { chip: "bg-recess2 text-recess2-ink" },
  lunch: { chip: "bg-lunch text-lunch-ink" },
};

export const mins = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

// Minutes after a window's end time during which students can still sign in (marked late).
export const LATE_GRACE = 10;

// The window open for sign-in right now: from its start through the whole minute that is
// LATE_GRACE minutes after its end (10:25:59 still counts for a 10:15 end). Sign-ins after the end
// minute are late. Between windows, and after the last one, there is none.
export function currentPeriod(now: number): Period | null {
  return PERIODS.find((x) => now >= x.start && now < x.end + LATE_GRACE + 1) ?? null;
}

export function nextPeriod(now: number): Period | null {
  return PERIODS.find((x) => x.start > now) ?? null;
}

export type Result = { status: Status; minutes: number; late: boolean; detail: string };

// On time = from the window start through the whole cutoff minute (10:15:59 is still 10:15). Within the window,
// "early" means whole minutes remaining before the cutoff; after it, sign-in is late.
export function evaluateSignIn(period: Period, now: number): Result {
  if (now >= period.end + 1) {
    const minutes = Math.max(1, Math.ceil(now - period.end));
    return { status: "late", minutes, late: true, detail: `You signed in ${minutes} min late` };
  }
  const minutes = Math.floor(period.end - now);
  if (minutes < 1)
    return { status: "ontime", minutes: 0, late: false, detail: "You signed in right on time" };
  return { status: "early", minutes, late: false, detail: `You signed in ${minutes} min early` };
}

// Teacher access to the attendance page locks itself after a period of inactivity.
export const AUTO_LOCK_MS = 5 * 60 * 1000;

export function isUnlocked(stamp: string | null, now: number = Date.now()) {
  const t = Number(stamp);
  return t > 0 && now - t >= 0 && now - t < AUTO_LOCK_MS;
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);

// All saved sign-ins as CSV (one row per sign-in), oldest first, for backup.
export function recordsToCsv(records: { [k: string]: SignIn }) {
  const rows = Object.entries(records).map(([key, rec]) => {
    const [day = "", periodId = "", student = ""] = key.split("|");
    const d = new Date(day);
    const date = Number.isNaN(d.getTime())
      ? day
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const period = PERIODS.find((p) => p.id === periodId)?.frame ?? periodId;
    return { date, period, student, at: rec.at ?? "", status: recordStatus(rec) };
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const lines = rows.map((r) =>
    [r.date, r.period, r.student, r.at, r.status].map(csvCell).join(","),
  );
  return ["Date,Window,Student,Time,Status", ...lines].join("\n") + "\n";
}

const SIGNIN_LOCK_KEY = "signin-locked";

// The teacher's Lock button turns student sign-in off until the teacher next unlocks Admin.
export const isSignInLocked = () => localStorage.getItem(SIGNIN_LOCK_KEY) === "1";

export function setSignInLocked(locked: boolean) {
  if (locked) localStorage.setItem(SIGNIN_LOCK_KEY, "1");
  else localStorage.removeItem(SIGNIN_LOCK_KEY);
}

const LAST_BACKUP_KEY = "signin-last-backup";
const BACKUP_SINCE_KEY = "signin-backup-since";
export const BACKUP_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

// A weekly reminder is due once a week has passed since the last backup (or, if there has never
// been one, since the app was first opened in Admin).
export function isBackupDue(last: string | null, since: string | null, now: number = Date.now()) {
  const t = Number(last) || Number(since);
  return t > 0 && now - t >= BACKUP_EVERY_MS;
}

export function markBackedUp(now: number = Date.now()) {
  localStorage.setItem(LAST_BACKUP_KEY, String(now));
}

export function lastBackupTime(): number | null {
  return Number(localStorage.getItem(LAST_BACKUP_KEY)) || null;
}

export function backupDue() {
  if (!localStorage.getItem(BACKUP_SINCE_KEY))
    localStorage.setItem(BACKUP_SINCE_KEY, String(Date.now()));
  return isBackupDue(localStorage.getItem(LAST_BACKUP_KEY), localStorage.getItem(BACKUP_SINCE_KEY));
}

// Full backup (class list + every sign-in) as JSON, restorable from the Admin Backup tab.
export function makeBackup(
  students: string[],
  records: { [k: string]: SignIn },
  archived: string[] = [],
) {
  return JSON.stringify({ version: 1, students, archived, records }, null, 2);
}

// Parses a backup file and merges it into the current data (nothing is deleted).
export function mergeBackup(
  text: string,
  students: string[],
  records: { [k: string]: SignIn },
  archived: string[] = [],
):
  { students: string[]; archived: string[]; records: { [k: string]: SignIn } } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "That file is not a valid backup" };
  }
  const d = data as { students?: unknown; archived?: unknown; records?: unknown };
  if (
    !d ||
    !Array.isArray(d.students) ||
    !d.students.every((s) => typeof s === "string") ||
    typeof d.records !== "object" ||
    d.records === null
  )
    return { error: "That file is not a valid backup" };
  const known = (s: string, list: string[]) =>
    list.some((m) => m.toLowerCase() === s.toLowerCase());
  const fileArchived = Array.isArray(d.archived)
    ? (d.archived as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const mergedArchived = [...archived];
  for (const s of fileArchived)
    if (!known(s, mergedArchived) && !known(s, students)) mergedArchived.push(s);
  const merged = [...students];
  for (const s of d.students as string[])
    if (!known(s, merged) && !known(s, mergedArchived)) merged.push(s);
  return {
    students: merged,
    archived: mergedArchived,
    records: { ...(d.records as object), ...records },
  };
}

export const windowLabel = (p: Period) => `${fmt(p.start)} to ${fmt(p.end)}`;

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

export function buildAttendance(
  records: { [k: string]: SignIn },
  students: string[] = STUDENTS,
): AttendanceDay[] {
  const days: string[] = [];
  for (const k of Object.keys(records)) {
    const [d = "", , student = ""] = k.split("|");
    if (d && students.includes(student) && !days.includes(d)) days.push(d);
  }
  days.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return days.map((day) => {
    const frames: AttendanceFrame[] = PERIODS.map((period) => {
      const rows: AttendanceRow[] = students.map((student) => ({
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

// Minutes since midnight from a saved time label such as "10:05 AM" (or "10:05" on a 24-hour clock).
export function recordMinutes(rec: SignIn): number | null {
  const m = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(rec.at ?? "");
  if (!m) return null;
  let h = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + mm;
}

// Weeks run Sunday to Saturday. Returns the Sunday of the week containing the day.
export function weekStart(day: string) {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  d.setDate(d.getDate() - d.getDay());
  return d.toDateString();
}

export type EarliestCell = { at: string; before: number } | null;

// For each student and window: the sign-in that came closest to (or furthest before) the window's
// end time across the given days. "before" is whole minutes before the end time (negative = after).
export function earliestArrivals(
  records: { [k: string]: SignIn },
  students: string[],
  days: string[],
): { student: string; cells: EarliestCell[] }[] {
  return students.map((student) => ({
    student,
    cells: PERIODS.map((period) => {
      let best: EarliestCell = null;
      for (const day of days) {
        const rec = records[`${day}|${period.id}|${student}`];
        const m = rec ? recordMinutes(rec) : null;
        if (rec && m !== null && (!best || period.end - m > best.before))
          best = { at: rec.at ?? "", before: period.end - m };
      }
      return best;
    }),
  }));
}

export function beforeEndLabel(before: number) {
  if (before > 0) return `${before} min before end`;
  if (before === 0) return "At end time";
  return `${-before} min after end`;
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
