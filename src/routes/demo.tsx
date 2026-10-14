import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminAttendance } from "@/components/admin-attendance";
import {
  PERIODS,
  clockLabel,
  displayName,
  evaluateSignIn,
  fmt,
  type Period,
  type SignIn,
} from "@/lib/frames";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo - High School Class Sign-In" },
      { name: "description", content: "Demo of the class sign-in app with sample data." },
    ],
  }),
  component: Demo,
});

const DEMO_STUDENTS = ["Hindy Fisch", "Mindy Katina", "Esty Oberlander", "Esty Weiss"];

type Scenario = "early" | "ontime" | "late";

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: "early", label: "Early" },
  { id: "ontime", label: "On time" },
  { id: "late", label: "Late" },
];

// Simulated time (minutes since midnight) for a scenario within a period.
function timeFor(p: Period, s: Scenario) {
  if (s === "early") return p.start;
  if (s === "ontime") return p.end + 0.5;
  return p.end + 4.5;
}

function dateAt(m: number) {
  const d = new Date();
  d.setHours(Math.floor(m / 60), Math.floor(m % 60), 0, 0);
  return d;
}

function makeRecord(name: string, students: string[], p: Period, m: number): SignIn {
  const r = evaluateSignIn(p, m);
  return {
    text: `${p.greet}, ${displayName(name, students)}! ${r.detail}.`,
    late: r.late,
    at: clockLabel(dateAt(m)),
    status: r.status,
    greet: p.greet,
    name,
    detail: r.detail,
  };
}

// Sample attendance for the last few weekdays, with a deterministic mix of early/on time/late/absent.
function seedRecords() {
  const records: { [k: string]: SignIn } = {};
  const today = new Date();
  let back = 1;
  let made = 0;
  while (made < 8) {
    const d = new Date(today);
    d.setDate(today.getDate() - back++);
    if (d.getDay() === 6) continue; // Saturday
    made += 1;
    PERIODS.forEach((p, pi) => {
      DEMO_STUDENTS.forEach((s, si) => {
        const roll = (made * 7 + pi * 3 + si * 5) % 10;
        if (roll === 0) return; // absent
        const m = roll < 5 ? p.start + (roll % 3) : roll < 8 ? p.end + 0.5 : p.end + 1 + (roll % 4);
        records[`${d.toDateString()}|${p.id}|${s}`] = makeRecord(s, DEMO_STUDENTS, p, m);
      });
    });
  }
  return records;
}

function Demo() {
  const [seed, setSeed] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed only forces a re-roll on Reset
  const base = useMemo(() => seedRecords(), [seed]);
  const [added, setAdded] = useState<{ [k: string]: SignIn }>({});
  const [periodId, setPeriodId] = useState(PERIODS[0]!.id);
  const [scenario, setScenario] = useState<Scenario>("early");
  const [msg, setMsg] = useState<SignIn | null>(null);

  const period = PERIODS.find((p) => p.id === periodId)!;
  const m = timeFor(period, scenario);
  const day = new Date().toDateString();
  const records = { ...base, ...added };
  const key = (s: string) => `${day}|${period.id}|${s}`;

  function signIn(name: string) {
    if (records[key(name)]) return;
    const rec = makeRecord(name, DEMO_STUDENTS, period, m);
    setAdded({ ...added, [key(name)]: rec });
    setMsg(rec);
  }

  const chip = "rounded-xl border-2 border-frame px-4 py-2 text-base font-bold";
  const on = "bg-primary text-primary-foreground";

  return (
    <main className="min-h-screen bg-muted p-3 sm:p-5 text-foreground">
      <div className="flex flex-col overflow-hidden rounded-3xl border-4 border-frame bg-background">
        <div className="bg-late px-6 py-2 text-center text-sm font-bold text-late-foreground">
          DEMO MODE: sample data and a simulated clock. Nothing here is saved.
        </div>
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h1 className="text-lg font-bold">High School Class Sign-In (Demo)</h1>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <button
              onClick={() => {
                setAdded({});
                setMsg(null);
                setSeed(seed + 1);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Reset demo
            </button>
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Real app
            </Link>
          </nav>
        </header>

        <section className="flex flex-col items-center gap-6 px-6 py-8">
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Window">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodId(p.id)}
                aria-pressed={p.id === periodId}
                className={`${chip} ${p.id === periodId ? on : "bg-background"}`}
              >
                {p.emoji} {p.frame}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Arrival">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                aria-pressed={s.id === scenario}
                className={`${chip} ${s.id === scenario ? on : "bg-background"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-2xl font-semibold text-muted-foreground">
            Simulated time {clockLabel(dateAt(m))} (window {fmt(period.start)} to {fmt(period.end)})
          </p>

          <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEMO_STUDENTS.map((s) => {
              const rec = records[key(s)];
              return (
                <button
                  key={s}
                  disabled={!!rec}
                  onClick={() => signIn(s)}
                  className="rounded-2xl px-4 py-6 text-2xl font-bold disabled:opacity-50 border-4 border-frame bg-early text-early-foreground"
                >
                  {s}
                  {rec && (
                    <span className="block text-base font-medium mt-1">✓ Signed in {rec.at}</span>
                  )}
                </button>
              );
            })}
          </div>

          {msg && (
            <div className="w-full max-w-2xl rounded-3xl border-4 border-frame p-6 text-center">
              <p aria-hidden className="text-7xl">
                {msg.late ? "😞" : "😊"}
              </p>
              <p className="mt-3 text-3xl font-black">
                {msg.greet}, {displayName(msg.name ?? "", DEMO_STUDENTS)}!
              </p>
              <p className="mt-2 text-xl font-bold">{msg.detail}</p>
              <button onClick={() => setMsg(null)} className={`${chip} mt-4 bg-background`}>
                Close
              </button>
            </div>
          )}
        </section>

        <section className="flex flex-col items-center border-t border-border px-6 py-8">
          <h2 className="mb-4 text-xl font-bold">Attendance (sample data)</h2>
          <AdminAttendance records={records} students={DEMO_STUDENTS} />
        </section>
      </div>
    </main>
  );
}
