import { useMemo } from "react";
import {
  buildAttendance,
  dayLabel,
  recordsToCsv,
  recordStatus,
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

const cell = "border border-border px-4 py-3 align-top";

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
        <p className="text-xl font-bold text-muted-foreground">No sign-ins recorded yet.</p>
      ) : (
        days.map((d) => (
          <section key={d.day} className="w-full max-w-5xl">
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
                                <span
                                  className={
                                    status === "late"
                                      ? "block font-bold text-destructive"
                                      : "block text-muted-foreground"
                                  }
                                >
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
        ))
      )}
      <p className="max-w-5xl text-center text-sm text-muted-foreground">
        Times come from this device's clock. Sign-ins are saved in this browser only, so use the
        Backup tab to keep a copy.
      </p>
    </div>
  );
}
