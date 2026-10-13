import { AnalogClock } from "@/components/analog-clock";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LATE_GRACE,
  PERIODS,
  TONES,
  clockLabel,
  fmt,
  currentPeriod,
  displayName,
  evaluateSignIn,
  nextPeriod,
  loadRecords,
  loadStudents,
  mins,
  saveRecords,
  type SignIn,
} from "@/lib/frames";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "High School Class Sign-In" },
      { name: "description", content: "Student sign-in for arrival, recess and lunch." },
      { property: "og:title", content: "High School Class Sign-In" },
      { property: "og:description", content: "Student sign-in for arrival, recess and lunch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [now, setNow] = useState<Date | null>(null);
  const [records, setRecords] = useState<{ [k: string]: SignIn }>({});
  const [msg, setMsg] = useState<SignIn | null>(null);
  const [students, setStudents] = useState<string[]>([]);

  useEffect(() => {
    setNow(new Date());
    setStudents(loadStudents());
    setRecords(loadRecords());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  const n = mins(now);
  const period = currentPeriod(n);
  const upcoming = nextPeriod(n);
  const tone = TONES[(period ?? upcoming ?? PERIODS[0]!).tone];
  const isLate = period ? evaluateSignIn(period, n).late : false;
  const open = !!period;
  const day = now.toDateString();
  const key = (s: string) => `${day}|${period?.id}|${s}`;

  function signIn(name: string) {
    if (!period || !now) return;
    const r = evaluateSignIn(period, n);
    const rec: SignIn = {
      text: `${period.greet}, ${displayName(name, students)}! ${r.detail}.`,
      late: r.late,
      at: clockLabel(now),
      status: r.status,
      greet: period.greet,
      name,
      detail: r.detail,
    };
    // Read the latest saved records so quick taps by different students don't overwrite each other.
    const saved = loadRecords();
    if (saved[key(name)]) return;
    const next = { ...saved, [key(name)]: rec };
    setRecords(next);
    saveRecords(next);
    setMsg(rec);
  }

  const solid = (late: boolean) =>
    late
      ? "border-4 border-late-border bg-late text-late-foreground"
      : "border-4 border-ontime-border bg-ontime text-ontime-foreground";

  return (
    <main className="min-h-screen bg-muted p-3 sm:p-5 text-foreground">
      <div className="flex min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-3xl border-4 border-frame bg-background">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h1 className="text-lg font-bold">High School Class Sign-In</h1>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          </nav>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-10">
          <section className="text-center">
            <div className="flex justify-center">
              <AnalogClock minutes={n} />
            </div>
            <p className="mt-4 text-8xl sm:text-9xl font-black tabular-nums leading-none">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-3 text-2xl font-semibold text-muted-foreground">
              {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p
              className={`mt-8 inline-flex items-center gap-6 rounded-3xl px-10 py-4 text-6xl sm:text-7xl font-black tracking-tight border-4 border-current ${tone.chip}`}
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
                ? isLate
                  ? `Late sign-in until ${fmt(period.end + LATE_GRACE)}`
                  : `Sign-in closes at ${fmt(period.end)}`
                : upcoming
                  ? `Sign-in opens at ${fmt(upcoming.start)}`
                  : "Sign-in is closed"}
            </p>
          </section>

          <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            {students.map((s) => {
              const rec = records[key(s)];
              return (
                <button
                  key={s}
                  disabled={!open || !!rec}
                  onClick={() => signIn(s)}
                  className="rounded-2xl px-4 py-6 text-2xl font-bold disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ring border-4 border-frame bg-card text-foreground"
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
      </div>

      <DialogPrimitive.Root open={!!msg} onOpenChange={(o) => !o && setMsg(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-background p-8 sm:p-12 text-center focus:outline-none"
          >
            <DialogPrimitive.Close
              aria-label="Close message"
              className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-frame bg-background text-foreground"
            >
              <X aria-hidden className="h-8 w-8" strokeWidth={3} />
            </DialogPrimitive.Close>
            <p aria-hidden className="text-8xl sm:text-9xl leading-none">
              {msg?.late ? "😞" : "😊"}
            </p>
            <DialogPrimitive.Title className="mt-6 text-3xl sm:text-4xl font-semibold text-muted-foreground">
              {msg?.greet ?? "Hello"},
              <span className="mt-1 block text-5xl sm:text-7xl font-black text-foreground">
                {msg?.name ? displayName(msg.name, students) : msg?.text}!
              </span>
            </DialogPrimitive.Title>
            {msg?.detail && (
              <p
                className={`mt-8 inline-block rounded-full px-8 py-3 text-2xl sm:text-3xl font-bold ${solid(!!msg.late)}`}
              >
                {msg.detail}
              </p>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </main>
  );
}
