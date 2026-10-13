import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  TONES,
  buildAttendance,
  dayLabel,
  hashPassword,
  loadRecords,
  recordStatus,
  saveRecords,
  windowLabel,
  type SignIn,
  type Status,
} from "@/lib/frames";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Teacher Attendance" },
      {
        name: "description",
        content: "Student arrival times with on time, early and late sign-ins.",
      },
      { property: "og:title", content: "Teacher Attendance" },
      {
        property: "og:description",
        content: "Student arrival times with on time, early and late sign-ins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Attendance,
});

const CHIP: { [k in Status]: string } = {
  early: "bg-early text-early-foreground",
  ontime: "bg-ontime text-ontime-foreground",
  late: "bg-late text-late-foreground",
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

  function clearRecord(day: string, periodId: string, student: string) {
    if (!window.confirm(`Clear ${student}'s sign-in?`)) return;
    const next = { ...records };
    delete next[`${day}|${periodId}|${student}`];
    setRecords(next);
    saveRecords(next);
  }

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
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h1 className="text-lg font-bold">Attendance</h1>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to sign-in
          </Link>
        </nav>
      </header>

      <div className="flex-1 flex flex-col items-center gap-8 px-6 py-10">
        {!checked ? null : !ok ? (
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
          >
            <label htmlFor="teacher-pw" className="block text-xl font-bold">
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
              className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-4 focus:ring-ring"
              placeholder="Password"
            />
            {err && <p className="mt-3 text-base font-bold text-destructive">{err}</p>}
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-lg font-bold text-primary-foreground"
            >
              Show attendance
            </button>
            <p className="mt-3 text-sm text-muted-foreground">
              No password yet? The first one you type here becomes the password.
            </p>
          </form>
        ) : days.length === 0 ? (
          <p className="text-2xl font-bold text-muted-foreground">No sign-ins recorded yet.</p>
        ) : (
          days.map((d) => (
            <section key={d.day} className="w-full max-w-5xl">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-2xl font-bold">{dayLabel(d.day)}</h2>
                <p className="text-base font-semibold text-muted-foreground">
                  {d.signedIn} of {d.total} sign-ins
                </p>
              </div>

              <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
                {d.frames.map((f) => {
                  const tone = TONES[f.period.tone];
                  return (
                    <div key={f.period.id} className="rounded-2xl border border-border bg-card p-5">
                      <span
                        className={`inline-block rounded-full px-4 py-1 text-lg font-bold ${tone.chip}`}
                      >
                        {f.period.frame}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-muted-foreground">
                        Sign-in {windowLabel(f.period)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {f.counts.ontime} on time · {f.counts.early} early · {f.counts.late} late ·{" "}
                        {f.counts.missing} missing
                      </p>
                      <ul className="mt-4 grid gap-2">
                        {f.rows.map((r) => (
                          <li
                            key={r.student}
                            className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"
                          >
                            <span className="text-base font-semibold">{r.student}</span>
                            {r.rec ? (
                              <span className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-sm font-bold ${CHIP[recordStatus(r.rec)]}`}
                                >
                                  {r.rec.at ? `${r.rec.at} · ` : ""}
                                  {CHIP_LABEL[recordStatus(r.rec)]}
                                </span>
                                <button
                                  onClick={() => clearRecord(d.day, f.period.id, r.student)}
                                  aria-label={`Clear ${r.student}'s sign-in`}
                                  className="text-sm font-semibold text-muted-foreground underline"
                                >
                                  Clear
                                </button>
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-muted-foreground">
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
      </div>
    </main>
  );
}
