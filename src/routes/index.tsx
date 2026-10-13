import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  STUDENTS,
  TONES,
  clockLabel,
  currentPeriod,
  hashPassword,
  loadRecords,
  mins,
  saveRecords,
  windowLabel,
  type SignIn,
  type Status,
} from "@/lib/frames";

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

function Index() {
  const [now, setNow] = useState<Date | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [records, setRecords] = useState<{ [k: string]: SignIn }>({});
  const [msg, setMsg] = useState<SignIn | null>(null);

  useEffect(() => {
    setNow(new Date());
    setEnabled(localStorage.getItem("signin-enabled") === "1");
    setRecords(loadRecords());
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
    const h = await hashPassword(pw);
    if (!stored) localStorage.setItem("signin-pw", h);
    else if (stored !== h) return alert("Incorrect password");
    const v = !enabled;
    setEnabled(v);
    localStorage.setItem("signin-enabled", v ? "1" : "0");
  }

  function signIn(name: string) {
    const first = name.split(" ")[0];
    let detail: string;
    let status: Status;
    if (n < period.start) {
      detail = `You signed in ${Math.ceil(period.start - n)} min early`;
      status = "early";
    } else if (!isLate) {
      detail = "You signed in on time";
      status = "ontime";
    } else {
      detail = `You signed in ${Math.ceil(n - period.end)} min late`;
      status = "late";
    }
    const rec: SignIn = {
      text: `${period.greet}, ${first}! ${detail}.`,
      late: isLate,
      at: clockLabel(now!),
      status,
    };
    const next = { ...records, [key(name)]: rec };
    setRecords(next);
    saveRecords(next);
    setMsg(rec);
    setTimeout(() => setMsg(null), 6000);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-8 gap-8">
      <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 ${tone.wash}`} />

      <header className="text-center">
        <p className={`text-8xl sm:text-9xl font-black tabular-nums leading-none ${tone.clock}`}>
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.4em] text-foreground/70">Right now</p>
        <div className={`mt-3 inline-block px-10 py-5 rounded-[2.5rem] ${tone.badge}`}>
          <span className="inline-block text-6xl sm:text-7xl font-black tracking-tight badge-ink">
            {period.frame}
          </span>
        </div>
        <p className="mt-5 text-2xl font-semibold text-muted-foreground">sign-in · {windowLabel(period)}</p>
      </header>

      {msg && (
        <div className={`w-full max-w-4xl rounded-3xl p-8 text-center text-5xl font-bold ${msg.late ? "grad-late glow-late text-late-foreground" : "grad-ontime glow-ontime text-ontime-foreground"}`}>
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
              className={`flex-1 min-w-0 rounded-2xl px-3 py-5 text-xl font-bold disabled:opacity-60 ${late ? "grad-late glow-late text-late-foreground" : "grad-ontime glow-ontime text-ontime-foreground"}`}
            >
              {s}
              {rec && (
                <span className="block text-sm font-medium mt-1">
                  ✓ Signed in{rec.at ? ` ${rec.at}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Link to="/attendance" className="text-base font-semibold underline text-foreground/70">
          Teacher: view attendance
        </Link>
        <button onClick={toggle} className="text-base font-semibold underline text-foreground/70">
          {enabled ? "Teacher: disable sign-in" : "Teacher: enable sign-in"}
        </button>
      </div>
    </main>
  );
}
