import {
  PERIODS,
  STUDENTS,
  clockLabel,
  displayName,
  evaluateSignIn,
  hashPassword,
  type Period,
  type SignIn,
} from "@/lib/frames";

export const DEMO_PASSWORD = "demo";

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
    text: `${p.greet}, ${displayName(name, STUDENTS)}! ${r.detail}.`,
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
      STUDENTS.forEach((s, si) => {
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
  local.setItem("signin-records", JSON.stringify(sampleRecords()));
  void hashPassword(DEMO_PASSWORD).then((h) => local.setItem("signin-pw", h));
  Object.defineProperty(window, "localStorage", { value: local, configurable: true });
  Object.defineProperty(window, "sessionStorage", { value: memoryStorage(), configurable: true });
  return () => {
    if (real.local) Object.defineProperty(window, "localStorage", real.local);
    if (real.session) Object.defineProperty(window, "sessionStorage", real.session);
  };
}

export type DemoWhen = { periodId: string; arrival: "early" | "ontime" | "late" } | null;

let when: DemoWhen = null;
export const setDemoWhen = (w: DemoWhen) => {
  when = w;
};

// The clock the demo's sign-in page uses: the real time, or a simulated moment in a window.
export function demoNow(): Date {
  const p = PERIODS.find((x) => x.id === when?.periodId);
  if (!when || !p) return new Date();
  const m =
    when.arrival === "early" ? p.start : when.arrival === "ontime" ? p.end + 0.5 : p.end + 4.5;
  return dateAt(m);
}
