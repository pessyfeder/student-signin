import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  beforeEndLabel,
  buildAttendance,
  earliestArrivals,
  dayLabel,
  fmt,
  PERIODS,
  recordsToCsv,
  recordStatus,
  weekStart,
  windowLabel,
  type SignIn,
  type Status,
} from "@/lib/frames";

const STATUS_LABEL: { [k in Status]: string } = {
  early: "Early",
  ontime: "On time",
  late: "Late",
};

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Early and on time are colored like late is, so status reads at a glance.
const STATUS_COLOR: { [k in Status]: string } = {
  early: "text-early",
  ontime: "text-ontime-border",
  late: "text-destructive",
};

const weekLabel = (day: string) => {
  const d = new Date(day);
  return Number.isNaN(d.getTime())
    ? day
    : d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
};

const cell = "border border-border px-4 py-3 align-top";

export function AdminAttendance({
  records,
  students,
}: {
  records: { [k: string]: SignIn };
  students: string[];
}) {
  const days = useMemo(() => buildAttendance(records, students), [records, students]);

  // Days arrive newest first; group them into Sunday to Saturday weeks (weeks stay newest first).
  const weeks = useMemo(() => {
    const out: { start: string; days: typeof days }[] = [];
    for (const d of days) {
      const start = weekStart(d.day);
      const last = out[out.length - 1];
      if (last && last.start === start) last.days.push(d);
      else out.push({ start, days: [d] });
    }
    // Within a week, list the days earliest to latest.
    for (const w of out) w.days.reverse();
    return out;
  }, [days]);

  // Weeks are newest first: index 0 is the latest week; the left arrow goes back to an older week.
  const [idx, setIdx] = useState(0);
  const at = Math.min(idx, Math.max(weeks.length - 1, 0));
  const week = weeks[at];
  const arrow =
    "rounded-xl border border-border bg-muted p-2 disabled:opacity-40 focus-visible:outline-4 focus-visible:outline-ring";

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        {week ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIdx(at + 1)}
              disabled={at >= weeks.length - 1}
              aria-label="Previous week"
              className={arrow}
            >
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
            <p className="text-base font-bold">Week of {weekLabel(week.start)}</p>
            <button
              onClick={() => setIdx(at - 1)}
              disabled={at <= 0}
              aria-label="Next week"
              className={arrow}
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <span />
        )}
        <button
          onClick={() => download("attendance.csv", recordsToCsv(records), "text/csv")}
          className="rounded-xl border border-border bg-muted px-4 py-2 text-sm font-bold"
        >
          Download CSV
        </button>
      </div>
      {days.length === 0 ? (
        <p className="text-xl font-bold text-muted-foreground">No sign-ins recorded yet.</p>
      ) : (
        (week ? [week] : []).map((w) => (
          <div key={w.start} className="flex w-full max-w-5xl flex-col gap-8">
            {w.days.map((d) => (
              <section key={d.day}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-xl font-bold">{dayLabel(d.day)}</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {d.signedIn} of {d.total} sign-ins
                  </p>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse border border-border text-left text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th scope="col" className={`${cell} font-bold`}>
                          Student
                        </th>
                        {d.frames.map((f) => (
                          <th key={f.period.id} scope="col" className={cell}>
                            <span className="block font-bold">{f.period.frame}</span>
                            <span className="block font-normal text-muted-foreground">
                              {windowLabel(f.period)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, i) => (
                        <tr key={student}>
                          <th scope="row" className={`${cell} font-bold`}>
                            {student}
                          </th>
                          {d.frames.map((f) => {
                            const rec = f.rows[i]?.rec;
                            const status = rec ? recordStatus(rec) : null;
                            return (
                              <td key={f.period.id} className={cell}>
                                {rec && status ? (
                                  <>
                                    <span className="block tabular-nums">{rec.at}</span>
                                    <span className={`block font-bold ${STATUS_COLOR[status]}`}>
                                      {STATUS_LABEL[status]}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Not signed in</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted">
                        <th scope="row" className={`${cell} font-bold`}>
                          Totals
                        </th>
                        {d.frames.map((f) => (
                          <td key={f.period.id} className={`${cell} text-muted-foreground`}>
                            {f.counts.early + f.counts.ontime} on time, {f.counts.late} late,{" "}
                            {f.counts.missing} missing
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            ))}
            <section>
              <h2 className="text-xl font-bold">Week of {weekLabel(w.start)} - Earliest Arrival</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Earliest sign-in this week for each window, compared with the window's end time.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse border border-border text-left text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th scope="col" className={`${cell} font-bold`}>
                        Student
                      </th>
                      {PERIODS.map((p) => (
                        <th key={p.id} scope="col" className={cell}>
                          <span className="block font-bold">{p.frame}</span>
                          <span className="block font-normal text-muted-foreground">
                            Ends {fmt(p.end)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {earliestArrivals(
                      records,
                      students,
                      w.days.map((d) => d.day),
                    ).map((row) => (
                      <tr key={row.student}>
                        <th scope="row" className={`${cell} font-bold`}>
                          {row.student}
                        </th>
                        {row.cells.map((c, i) => (
                          <td key={PERIODS[i]!.id} className={cell}>
                            {c ? (
                              <>
                                <span className="block tabular-nums">{c.at}</span>
                                <span className="block text-muted-foreground">
                                  {beforeEndLabel(c.before)}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">No sign-ins</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ))
      )}
      <p className="max-w-5xl text-center text-sm text-muted-foreground">
        Times come from this device's clock. Sign-ins are saved in this browser only, so use the
        Backup tab to keep a copy.
      </p>
    </div>
  );
}
