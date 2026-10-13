import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  TONES,
  buildAttendance,
  dayLabel,
  hashPassword,
  loadRecords,
  recordStatus,
  windowLabel,
  type SignIn,
  type Status,
} from "@/lib/frames";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Teacher Attendance" },
      { name: "description", content: "Student arrival times with on time, early and late sign-ins." },
      { property: "og:title", content: "Teacher Attendance" },
      { property: "og:description", content: "Student arrival times with on time, early and late sign-ins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Attendance,
});

const CHIP: { [k in Status]: string } = {
  early: "grad-early glow-early",
  ontime: "grad-ontime glow-ontime",
  late: "grad-late glow-late",
};

const CHIP_LABEL: { [k in Status]: string } = {
  early: "Early",
  ontime: "On time",
  late: "Late",
};

function Attendance() {
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [records, setRecords] = useState<{ [k: string]: SignIn }>({});

  useEffect(() => {
    if (sessionStorage.getItem("teacher-ok") === "1") setOk(true);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (ok) setRecords(loadRecords());
  }, [ok]);

  const days = useMemo(() => buildAttendance(records), [records]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const typed = pw.trim();
    if (!typed) return;
    const h = await hashPassword(typed);
    const stored = localStorage.getItem("signin-pw");
    if (!stored) {
      localStorage.setItem("signin-pw", h);
    } else if (stored !== h) {
      setErr("Incorrect password");
      return;
    }
    sessionStorage.setItem("teacher-ok", "1");
    setErr("");
    setOk(true);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center px-6 py-10 gap-8">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 wash-rainbow" />

      <header className="text-center">
        <div className="inline-block px-10 py-4 rounded-[2.5rem] grad-rainbow glow-rainbow">
          <span className="inline-block text-5xl sm:text-6xl font-black tracking-tight badge-ink">
            Attendance
          </span>
        </div>
        <p className="mt-4 text-xl font-semibold text-muted-foreground">
          Arrival times recorded on this device
        </p>
      </header>

      {!checked ? null : !ok ? (
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-card p-7">
          <label htmlFor="teacher-pw" className="block text-2xl font-black">
            Teacher password
          </label>
          <input
            id="teacher-pw"
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr("");
            }}
            className="mt-3 w-full rounded-2xl border border-input bg-background px-4 py-3 text-xl outline-none focus:ring-4 focus:ring-ring"
            placeholder="Password"
          />
          {err && <p className="mt-3 text-lg font-bold text-destructive">{err}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl grad-ontime glow-ontime px-4 py-3 text-xl font-bold text-bright"
          >
            Show attendance
          </button>
          <p className="mt-3 text-sm text-muted-foreground">
            No password yet? The first one you type here becomes the password.
          </p>
        </form>
      ) : days.length === 0 ? (
        <p className="text-3xl font-bold text-muted-foreground">No sign-ins recorded yet.</p>
      ) : (
        days.map((d) => (
          <section key={d.day} className="w-full max-w-5xl">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-3xl font-black">{dayLabel(d.day)}</h2>
              <p className="text-lg font-bold text-muted-foreground">
                {d.signedIn} of {d.total} sign-ins
              </p>
            </div>

            <div className="mt-4 grid items-start gap-5 lg:grid-cols-3">
              {d.frames.map((f) => {
                const tone = TONES[f.period.tone];
                return (
                  <div key={f.period.id} className="rounded-3xl border border-border bg-card p-5">
                    <span className={`inline-block rounded-full px-4 py-1.5 text-xl font-black text-bright ${tone.badge}`}>
                      {f.period.frame}
                    </span>
                    <p className="mt-3 text-sm font-bold text-muted-foreground">
                      sign-in · {windowLabel(f.period)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-muted-foreground">
                      {f.counts.ontime} on time · {f.counts.early} early · {f.counts.late} late ·{" "}
                      {f.counts.missing} missing
                    </p>
                    <ul className="mt-4 grid gap-2">
                      {f.rows.map((r) => (
                        <li
                          key={r.student}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3"
                        >
                          <span className="text-lg font-bold">{r.student}</span>
                          {r.rec ? (
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-black text-bright ${CHIP[recordStatus(r.rec)]}`}
                            >
                              {r.rec.at ? `${r.rec.at} · ` : ""}
                              {CHIP_LABEL[recordStatus(r.rec)]}
                            </span>
                          ) : (
                            <span className="rounded-full bg-background px-3 py-1 text-sm font-bold text-muted-foreground">
                              Not signed in
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <Link to="/" className="text-base font-semibold underline text-foreground/70">
        Back to sign-in
      </Link>
    </main>
  );
}
