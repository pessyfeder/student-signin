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
// minutes since midnight
const PERIODS = [
  { id: "arrival", greet: "Good Morning", start: 600, end: 615 },
  { id: "recess", greet: "Good day", start: 688, end: 693 },
  { id: "lunch", greet: "Good Afternoon", start: 805, end: 805 },
];

const mins = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
function currentPeriod(now: number) {
  let p = PERIODS[0];
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
    <main className="min-h-screen flex flex-col items-center px-6 py-10 gap-8">
      <header className="text-center">
        <p className="text-6xl font-bold tabular-nums">
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-2 text-xl text-muted-foreground">
          {period.greet} sign-in · {fmt(period.start)}
          {period.end !== period.start && `–${fmt(period.end)}`}
        </p>
      </header>

      {msg && (
        <div className={`w-full max-w-3xl rounded-2xl p-6 text-center text-3xl font-semibold ${msg.late ? "bg-late text-late-foreground" : "bg-ontime text-ontime-foreground"}`}>
          {msg.text}
        </div>
      )}

      <div className="w-full max-w-3xl flex flex-col gap-5">
        {STUDENTS.map((s) => {
          const rec = records[key(s)];
          const late = rec ? rec.late : isLate;
          return (
            <button
              key={s}
              disabled={!enabled || !!rec}
              onClick={() => signIn(s)}
              className={`rounded-3xl py-10 text-4xl font-bold shadow-lg transition active:scale-95 disabled:opacity-60 ${late ? "bg-late text-late-foreground" : "bg-ontime text-ontime-foreground"}`}
            >
              {s}
              {rec && <span className="block text-lg font-medium mt-2">✓ Signed in</span>}
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
