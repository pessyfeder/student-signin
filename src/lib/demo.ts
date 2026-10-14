import {
  PERIODS,
  clockLabel,
  displayName,
  evaluateSignIn,
  hashPassword,
  type Period,
  type SignIn,
} from "@/lib/frames";

export const DEMO_PASSWORD = "demo";

// Made-up names for the demo only.
const DEMO_STUDENTS = ["Rivka Stein", "Miriam Gold", "Leah Weiss"];

// A Storage that lives only in memory, so the demo never saves anything.
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const dateAt = (m: number) => {
  const d = new Date();
  d.setHours(Math.floor(m / 60), Math.floor(m % 60), 0, 0);
  return d;
};

function makeRecord(name: string, p: Period, m: number): SignIn {
  const r = evaluateSignIn(p, m);
  return {
    text: `${p.greet}, ${displayName(name, DEMO_STUDENTS)}! ${r.detail}.`,
    late: r.late,
    at: clockLabel(dateAt(m)),
    status: r.status,
    greet: p.greet,
    name,
    detail: r.detail,
  };
}

// Sample attendance for the last 8 weekdays: a fixed mix of early, on time, late and absent.
function sampleRecords() {
  const records: { [k: string]: SignIn } = {};
  const today = new Date();
  let back = 1;
  let made = 0;
  while (made < 8) {
    const d = new Date(today);
    d.setDate(today.getDate() - back++);
    if (d.getDay() === 6) continue;
    made += 1;
    PERIODS.forEach((p, pi) =>
      DEMO_STUDENTS.forEach((s, si) => {
        const roll = (made * 7 + pi * 3 + si * 5) % 10;
        if (roll === 0) return;
        const m = roll < 5 ? p.start + (roll % 3) : roll < 8 ? p.end + 0.5 : p.end + 1 + (roll % 4);
        records[`${d.toDateString()}|${p.id}|${s}`] = makeRecord(s, p, m);
      }),
    );
  }
  return records;
}

// Replaces localStorage and sessionStorage with fresh in-memory copies holding sample data.
// Returns a function that puts the real ones back.
export function installDemoStorage() {
  const real = {
    local: Object.getOwnPropertyDescriptor(window, "localStorage"),
    session: Object.getOwnPropertyDescriptor(window, "sessionStorage"),
  };
  const local = memoryStorage();
  local.setItem("signin-students", JSON.stringify(DEMO_STUDENTS));
  local.setItem("signin-records", JSON.stringify(sampleRecords()));
  void hashPassword(DEMO_PASSWORD).then((h) => local.setItem("signin-pw", h));
  Object.defineProperty(window, "localStorage", { value: local, configurable: true });
  Object.defineProperty(window, "sessionStorage", { value: memoryStorage(), configurable: true });
  return () => {
    if (real.local) Object.defineProperty(window, "localStorage", real.local);
    if (real.session) Object.defineProperty(window, "sessionStorage", real.session);
  };
}

let simulated: number | null = null;

// Minutes since midnight for the demo tour's current step, or null to use the real clock.
export const setDemoMinutes = (m: number | null) => {
  simulated = m;
};

// The clock the demo's sign-in page uses.
export const demoNow = (): Date => (simulated === null ? new Date() : dateAt(simulated));

export const TOUR: { minutes: number; text: string }[] = [
  { minutes: 595, text: "9:55 AM. It's before school, so sign-in is closed. It opens at 10:00." },
  { minutes: 600, text: "10:00 AM. The Good Morning window opens. Tap a name to sign in: early." },
  {
    minutes: 615,
    text: "10:15 AM. The last minute of the window. Signing in now is right on time.",
  },
  {
    minutes: 620,
    text: "10:20 AM. Past the cutoff, students can still sign in for 10 minutes, marked late.",
  },
  { minutes: 640, text: "10:40 AM. The window has closed until recess." },
  { minutes: 720, text: "12:00 PM. After Yiddish Recess opens." },
  { minutes: 805, text: "1:25 PM. After Lunch opens." },
  { minutes: 925, text: "3:25 PM. After English Recess, the last window of the day." },
  {
    minutes: 945,
    text: "3:45 PM. The day is over. Open Admin (password demo) to see the attendance.",
  },
];
