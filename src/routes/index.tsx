import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Class Sign-In" },
      { name: "description", content: "Student sign-in for arrival, recess and lunch." },
      { property: "og:title", content: "Class Sign-In" },
      { property: "og:description", content: "Student sign-in for arrival, recess and lunch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const STUDENTS = ["Hindy Fisch", "Mindy Katina", "Esty Oberlander"];

type Tone = "morning" | "recess" | "lunch";
type Period = {
  id: string;
  greet: string;
  frame: string;
  tone: Tone;
  start: number;
  end: number;
};

// minutes since midnight
const PERIODS: Period[] = [
  { id: "arrival", greet: "Good Morning", frame: "Good Morning", tone: "morning", start: 600, end: 615 },
  { id: "recess", greet: "Good day", frame: "After Recess", tone: "recess", start: 688, end: 693 },
  { id: "lunch", greet: "Good Afternoon", frame: "After Lunch", tone: "lunch", start: 805, end: 805 },
];

const TONES: { [k in Tone]: { wash: string; badge: string; clock: string; bubble: string } } = {
  morning: { wash: "wash-morning", badge: "grad-morning glow-morning", clock: "text-clock-morning", bubble: "grad-morning" },
  recess: { wash: "wash-recess", badge: "grad-recess glow-recess", clock: "text-clock-recess", bubble: "grad-recess" },
  lunch: { wash: "wash-lunch", badge: "grad-lunch glow-lunch", clock: "text-clock-lunch", bubble: "grad-lunch" },
};

const mins = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
function currentPeriod(now: number) {
  let p = PERIODS[0]!;
  for (const x of PERIODS) if (now >= x.start) p = x;
  return p;
}
async function hash(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

type Record = { text: string; late: boolean };

function Index() {
  const [now, setNow] = useState<Date | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [records, setRecords] = useState<{ [k: string]: Record }>({});
  const [msg, setMsg] = useState<Record | null>(null);

  useEffect(() => {
    setNow(new Date());
    setEnabled(localStorage.getItem("signin-enabled") === "1");
    setRecords(JSON.parse(localStorage.getItem("signin-records") || "{}"));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  const n = mins(now);
  const period = currentPeriod(n);
  const tone = TONES[period.tone];
  const isLate = n > period.end + 1 / 60;
  const day = now.toDateString();
  const key = (s: string) => `${day}|${period.id}|${s}`;

  async function toggle() {
    const stored = localStorage.getItem("signin-pw");
    const pw = window.prompt(stored ? "Teacher password:" : "Create a teacher password:");
    if (!pw) return;
    const h = await hash(pw);
    if (!stored) localStorage.setItem("signin-pw", h);
    else if (stored !== h) return alert("Incorrect password");
    const v = !enabled;
    setEnabled(v);
    localStorage.setItem("signin-enabled", v ? "1" : "0");
  }

  function signIn(name: string) {
    const first = name.split(" ")[0];
    let detail: string;
    if (n < period.start) detail = `You signed in ${Math.ceil(period.start - n)} min early`;
    else if (!isLate) detail = "You signed in on time";
    else detail = `You signed in ${Math.ceil(n - period.end)} min late`;
    const rec = { text: `${period.greet}, ${first}! ${detail}.`, late: isLate };
    const next = { ...records, [key(name)]: rec };
    setRecords(next);
    localStorage.setItem("signin-records", JSON.stringify(next));
    setMsg(rec);
    setTimeout(() => setMsg(null), 6000);
  }

  const fmt = (m: number) => {
    const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
    return `${h > 12 ? h - 12 : h}:${mm}`;
  };

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center px-6 py-8 gap-7">
      <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 ${tone.wash}`}>
        <span className={`absolute -left-20 top-6 h-64 w-64 rounded-full opacity-35 blur-3xl drift-a ${tone.bubble}`} />
        <span className={`absolute -right-16 top-1/3 h-72 w-72 rounded-full opacity-30 blur-3xl drift-b ${tone.bubble}`} />
        <span className={`absolute left-1/3 -bottom-24 h-80 w-80 rounded-full opacity-25 blur-3xl drift-c ${tone.bubble}`} />
      </div>

      <header className="text-center">
        <p className={`text-8xl sm:text-9xl font-black tabular-nums leading-none ${tone.clock}`}>
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.4em] text-foreground/70">Right now</p>
        <div key={period.frame} className={`mt-3 inline-block px-10 py-5 rounded-[2.5rem] shine pop-in ${tone.badge}`}>
          <span className="bob inline-block text-6xl sm:text-7xl font-black tracking-tight badge-ink">
            {period.frame}
          </span>
        </div>
        <p className="mt-5 text-2xl font-semibold text-muted-foreground">
          sign-in · {fmt(period.start)}
          {period.end !== period.start && `–${fmt(period.end)}`}
        </p>
      </header>

      {msg && (
        <div className={`w-full max-w-4xl rounded-3xl p-8 text-center text-5xl font-bold pop-in ${msg.late ? "grad-late glow-late text-late-foreground" : "grad-ontime glow-ontime text-ontime-foreground"}`}>
          {msg.text}
        </div>
      )}

      <div className="w-full max-w-4xl flex flex-row items-stretch gap-4">
        {STUDENTS.map((s) => {
          const rec = records[key(s)];
          const late = rec ? rec.late : isLate;
          return (
            <button
              key={s}
              disabled={!enabled || !!rec}
              onClick={() => signIn(s)}
              className={`flex-1 min-w-0 rounded-2xl px-3 py-5 text-xl font-bold transition active:scale-95 disabled:opacity-60 ${late ? "grad-late glow-late text-late-foreground" : "grad-ontime glow-ontime text-ontime-foreground"}`}
            >
              {s}
              {rec && <span className="block text-sm font-medium mt-1">✓ Signed in</span>}
            </button>
          );
        })}
      </div>

      <button onClick={toggle} className="mt-auto text-sm underline text-muted-foreground">
        {enabled ? "Teacher: disable sign-in" : "Teacher: enable sign-in"}
      </button>
    </main>
  );
}
