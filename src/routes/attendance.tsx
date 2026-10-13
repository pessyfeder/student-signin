import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  STUDENTS,
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
    <main className="min-h-screen bg-muted p-3 sm:p-5 text-foreground">
      <div className="flex min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-3xl border-4 border-frame bg-background">
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

                <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-muted">
                        <th
                          scope="col"
                          className="px-5 py-4 text-sm font-bold uppercase text-muted-foreground"
                        >
                          Student
                        </th>
                        {d.frames.map((f) => (
                          <th key={f.period.id} scope="col" className="px-5 py-4">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-base font-bold border-2 border-current ${TONES[f.period.tone].chip}`}
                            >
                              {f.period.emoji} {f.period.frame}
                            </span>
                            <span className="mt-1 block text-sm font-medium text-muted-foreground">
                              {windowLabel(f.period)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {STUDENTS.map((student, i) => (
                        <tr key={student} className="border-t border-border">
                          <th scope="row" className="px-5 py-4 text-lg font-bold">
                            {student}
                          </th>
                          {d.frames.map((f) => {
                            const rec = f.rows[i]?.rec;
                            return (
                              <td key={f.period.id} className="px-5 py-4">
                                {rec ? (
                                  <span className="flex flex-col items-start gap-1">
                                    <span
                                      className={`rounded-full px-3 py-1 text-sm font-bold ${CHIP[recordStatus(rec)]}`}
                                    >
                                      {CHIP_LABEL[recordStatus(rec)]}
                                    </span>
                                    <span className="text-base font-semibold tabular-nums">
                                      {rec.at}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-base font-semibold text-muted-foreground">
                                    Not signed in
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted">
                        <th
                          scope="row"
                          className="px-5 py-3 text-sm font-bold text-muted-foreground"
                        >
                          Totals
                        </th>
                        {d.frames.map((f) => (
                          <td
                            key={f.period.id}
                            className="px-5 py-3 text-sm font-semibold text-muted-foreground"
                          >
                            {f.counts.early + f.counts.ontime} on time · {f.counts.late} late ·{" "}
                            {f.counts.missing} missing
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
