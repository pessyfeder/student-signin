import * as DialogPrimitive from "@radix-ui/react-dialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PERIODS,
  STUDENTS,
  TONES,
  clockLabel,
  fmt,
  currentPeriod,
  evaluateSignIn,
  nextPeriod,
  hashPassword,
  loadRecords,
  mins,
  saveRecords,
  windowLabel,
  type SignIn,
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

  // Close the message window on its own after a few seconds.
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 8000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!now) return null;
  const n = mins(now);
  const period = currentPeriod(n);
  const upcoming = nextPeriod(n);
  const tone = TONES[(period ?? upcoming ?? PERIODS[0]!).tone];
  const isLate = period ? evaluateSignIn(period, n).late : false;
  const open = enabled && !!period;
  const day = now.toDateString();
  const key = (s: string) => `${day}|${period?.id}|${s}`;

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
    if (!period || !now) return;
    const r = evaluateSignIn(period, n);
    const rec: SignIn = {
      text: `${period.greet}, ${name}! ${r.detail}.`,
      late: r.late,
      at: clockLabel(now),
      status: r.status,
      greet: period.greet,
      name,
      detail: r.detail,
    };
    const next = { ...records, [key(name)]: rec };
    setRecords(next);
    saveRecords(next);
    setMsg(rec);
  }

  const solid = (late: boolean) =>
    late ? "bg-late text-late-foreground" : "bg-ontime text-ontime-foreground";

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h1 className="text-lg font-bold">Class Sign-In</h1>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link to="/attendance" className="text-muted-foreground hover:text-foreground">
            View attendance
          </Link>
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground">
            {enabled ? "Disable sign-in" : "Enable sign-in"}
          </button>
        </nav>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-10">
        <section className="text-center">
          <p className="text-8xl sm:text-9xl font-black tabular-nums leading-none">
            {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <p
            className={`mt-8 inline-flex items-center gap-6 rounded-3xl px-10 py-4 text-6xl sm:text-7xl font-black tracking-tight ${tone.chip}`}
          >
            <span aria-hidden className="text-7xl sm:text-8xl leading-none">
              {period ? period.emoji : "🔒"}
            </span>
            {period ? period.frame : "Sign-in closed"}
            <span aria-hidden className="text-7xl sm:text-8xl leading-none">
              {period ? period.emoji : "🔒"}
            </span>
          </p>
          <p className="mt-5 text-2xl font-medium text-muted-foreground">
            {period
              ? `Sign-in ${windowLabel(period)}`
              : upcoming
                ? `Sign-in opens at ${fmt(upcoming.start)}`
                : "Sign-in is closed"}
          </p>
          {!enabled && (
            <p className="mt-2 text-lg font-semibold text-muted-foreground">
              Sign-in is turned off by the teacher
            </p>
          )}
        </section>

        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STUDENTS.map((s) => {
            const rec = records[key(s)];
            const late = rec ? rec.late : isLate;
            return (
              <button
                key={s}
                disabled={!open || !!rec}
                onClick={() => signIn(s)}
                className={`rounded-2xl px-4 py-6 text-2xl font-bold disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ring ${solid(late)}`}
              >
                {s}
                {rec && (
                  <span className="block text-base font-medium mt-1">
                    ✓ Signed in{rec.at ? ` ${rec.at}` : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DialogPrimitive.Root open={!!msg} onOpenChange={(o) => !o && setMsg(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-background p-8 sm:p-12 text-center focus:outline-none"
          >
            <p aria-hidden className="text-8xl sm:text-9xl leading-none">
              {msg?.late ? "😞" : "😊"}
            </p>
            <DialogPrimitive.Title className="mt-6 text-3xl sm:text-4xl font-semibold text-muted-foreground">
              {msg?.greet ?? "Hello"},
              <span className="mt-1 block text-5xl sm:text-7xl font-black text-foreground">
                {msg?.name ?? msg?.text}!
              </span>
            </DialogPrimitive.Title>
            {msg?.detail && (
              <p
                className={`mt-8 inline-block rounded-full px-8 py-3 text-2xl sm:text-3xl font-bold ${solid(!!msg.late)}`}
              >
                {msg.detail}
              </p>
            )}
            <div className="mt-10">
              <DialogPrimitive.Close className="rounded-2xl bg-primary px-12 py-4 text-2xl font-bold text-primary-foreground">
                OK
              </DialogPrimitive.Close>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </main>
  );
}
