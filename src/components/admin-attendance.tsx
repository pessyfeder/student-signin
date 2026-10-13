import { useMemo } from "react";
import {
  TONES,
  buildAttendance,
  dayLabel,
  recordsToCsv,
  recordStatus,
  windowLabel,
  type SignIn,
  type Status,
} from "@/lib/frames";

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

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAttendance({
  records,
  students,
}: {
  records: { [k: string]: SignIn };
  students: string[];
}) {
  const days = useMemo(() => buildAttendance(records, students), [records, students]);

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full max-w-5xl justify-end">
        <button
          onClick={() => download("attendance.csv", recordsToCsv(records), "text/csv")}
          className="rounded-xl border border-border bg-muted px-4 py-2 text-sm font-bold"
        >
          Download CSV
        </button>
      </div>
      {days.length === 0 ? (
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
                  {students.map((student, i) => (
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
                    <th scope="row" className="px-5 py-3 text-sm font-bold text-muted-foreground">
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
      <p className="max-w-5xl text-center text-sm text-muted-foreground">
        Times come from this device&apos;s clock. Sign-ins are saved in this browser only, so use
        the Backup tab to keep a copy.
      </p>
    </div>
  );
}
