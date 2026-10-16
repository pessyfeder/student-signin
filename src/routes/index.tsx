import { DEMO_ONLY } from "@/lib/demo-config";
import { AnalogClock } from "@/components/analog-clock";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LATE_GRACE,
  PERIODS,
  TONES,
  clockLabel,
  fmt,
  currentPeriod,
  isSignInLocked,
  isSignInDay,
  displayName,
  evaluateSignIn,
  nextPeriod,
  loadCustomTimes,
  loadRecords,
  periodsFor,
  loadStudents,
  mins,
  saveRecords,
  type CustomTimes,
  type Period,
  type SignIn,
} from "@/lib/frames";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (DEMO_ONLY) throw redirect({ to: "/demo" });
  },
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
  component: () => <SignInPage />,
});

// Also used by the demo, which swaps in a simulated clock and its own Admin link.
export function SignInPage({
  adminTo = "/admin",
  getNow = () => new Date(),
}: {
  adminTo?: "/admin" | "/demo/admin";
  getNow?: () => Date;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [records, setRecords] = useState<{ [k: string]: SignIn }>({});
  const [msg, setMsg] = useState<SignIn | null>(null);
  const [students, setStudents] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [custom, setCustom] = useState<CustomTimes>({});

  useEffect(() => {
    setNow(getNow());
    setStudents(loadStudents());
    setRecords(loadRecords());
    setCustom(loadCustomTimes());
    setLocked(isSignInLocked());
    const t = setInterval(() => {
      setNow(getNow());
      setLocked(isSignInLocked());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  const n = mins(now);
  // The teacher's Lock button closes sign-in regardless of the schedule.
  const offDay = !isSignInDay(now);
  const closed = locked || offDay;
  const period = closed ? null : currentPeriod(n);
  const upcoming = offDay ? null : nextPeriod(n);
  const tone = TONES[(period ?? upcoming ?? PERIODS[0]!).tone];
  const isLate = period ? evaluateSignIn(period, n).late : false;
  const day = now.toDateString();
  // A student with custom times has their own window; the header shows the default schedule.
  const windowFor = (s: string) => (closed ? null : currentPeriod(n, periodsFor(s, custom)));
  const key = (s: string, p: Period) => `${day}|${p.id}|${s}`;

  function signIn(name: string, period: Period | null) {
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
    if (saved[key(name, period)]) return;
    const next = { ...saved, [key(name, period)]: rec };
    setRecords(next);
    saveRecords(next);
    setMsg(rec);
  }

  const solid = (late: boolean) =>
    late
      ? "border-4 border-late-border bg-late text-late-foreground"
      : "border-4 border-ontime-border bg-ontime text-ontime-foreground";

  return (
    <main className="h-[var(--app-h,100dvh)] overflow-hidden bg-muted p-3 sm:p-5 text-foreground">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-4 border-frame bg-background">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h1 className="text-lg font-bold">High School Class Sign-In</h1>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link to={adminTo} className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          </nav>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[2vh] px-6 py-[2vh]">
          <section className="text-center">
            <div className="flex justify-center">
              <AnalogClock minutes={n} className="h-[14vh] w-[14vh]" />
            </div>
            <p className="mt-[1.5vh] whitespace-nowrap text-[min(9.5vh,15vw)] font-black tabular-nums leading-none">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-[1vh] text-[min(2.6vh,4.5vw)] font-semibold text-muted-foreground">
              {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p
              className={`mt-[1.5vh] inline-flex items-center gap-[2vw] rounded-3xl px-[3vw] py-[1vh] text-[min(5.5vh,6vw)] font-black tracking-tight border-4 border-current ${tone.chip}`}
            >
              <span aria-hidden className="text-[min(6vh,7vw)] leading-none">
                {period ? period.emoji : "🔒"}
              </span>
              {period ? period.frame : "Sign-in closed"}
              <span aria-hidden className="text-[min(6vh,7vw)] leading-none">
                {period ? period.emoji : "🔒"}
              </span>
            </p>
            <p className="mt-[1.5vh] text-[min(2.4vh,4.5vw)] font-medium text-muted-foreground">
              {period
                ? isLate
                  ? `Late sign-in until ${fmt(period.end + LATE_GRACE)}`
                  : `Sign-in closes at ${fmt(period.end)}`
                : offDay
                  ? "Sign-in is open Monday to Thursday"
                  : locked
                    ? "Sign-in is locked by the teacher"
                    : upcoming
                    ? `Sign-in opens at ${fmt(upcoming.start)}`
                    : "Sign-in is closed"}
            </p>
          </section>

          <div className="min-h-0 w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 gap-[1.5vh] overflow-y-auto">
            {students.length === 0 && (
              <p className="col-span-full text-center text-[min(2.8vh,4.5vw)] font-bold">
                No students yet. A teacher can add them in Admin.
              </p>
            )}
            {students.map((s) => {
              const own = windowFor(s);
              const rec = own ? records[key(s, own)] : undefined;
              return (
                <button
                  key={s}
                  disabled={!own || !!rec}
                  onClick={() => signIn(s, own)}
                  className="rounded-2xl px-4 py-[1.5vh] text-[min(2.8vh,4.5vw)] font-bold disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ring border-4 border-frame bg-early text-early-foreground"
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
