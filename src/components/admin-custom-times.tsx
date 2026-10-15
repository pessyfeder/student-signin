import { useState, type FormEvent } from "react";
import {
  LATE_GRACE,
  PERIODS,
  displayName,
  fmt,
  parseTimeInput,
  saveCustomTimes,
  setCustomTimes,
  toTimeInput,
  type CustomTimes,
} from "@/lib/frames";

export function AdminCustomTimes({
  students,
  custom,
  onChange,
}: {
  students: string[];
  custom: CustomTimes;
  onChange: (c: CustomTimes) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [periodId, setPeriodId] = useState(PERIODS[0]!.id);
  const period = PERIODS.find((p) => p.id === periodId)!;
  const [start, setStart] = useState(toTimeInput(period.start));
  const [end, setEnd] = useState(toTimeInput(period.end));
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  function pickPeriod(id: string) {
    const p = PERIODS.find((x) => x.id === id)!;
    setPeriodId(id);
    setStart(toTimeInput(p.start));
    setEnd(toTimeInput(p.end));
    setErr("");
    setNote("");
  }

  function apply(next: CustomTimes, message: string) {
    saveCustomTimes(next);
    onChange(next);
    setNote(message);
    setErr("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = parseTimeInput(start);
    const en = parseTimeInput(end);
    setNote("");
    if (!picked.length) return setErr("Choose at least one student");
    if (s === null || en === null) return setErr("Enter a start and an end time");
    if (en <= s) return setErr("The end time must be after the start time");
    apply(
      setCustomTimes(custom, picked, periodId, { start: s, end: en }),
      `${period.frame}: ${fmt(s)} to ${fmt(en)} set for ${picked.length} student${picked.length === 1 ? "" : "s"}`,
    );
    setPicked([]);
  }

  const btn = "rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-bold";
  const field =
    "rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-4 focus:ring-ring";
  const rows = students.filter((s) => custom[s]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Set custom arrival times</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Students you choose get their own sign-in window. Everyone else keeps the default times.
          Sign-in stays open for {LATE_GRACE} minutes after the end time and is then marked late.
        </p>

        <fieldset className="mt-4">
          <legend className="flex w-full items-center justify-between text-base font-bold">
            Students
            <span className="flex gap-2">
              <button type="button" className={btn} onClick={() => setPicked([...students])}>
                All
              </button>
              <button type="button" className={btn} onClick={() => setPicked([])}>
                None
              </button>
            </span>
          </legend>
          {students.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Add students first.</p>
          )}
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {students.map((s) => (
              <label key={s} className="flex items-center gap-2 py-1 text-base font-semibold">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={picked.includes(s)}
                  onChange={(e) =>
                    setPicked(e.target.checked ? [...picked, s] : picked.filter((x) => x !== s))
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-base font-bold">
            Window
            <select
              value={periodId}
              onChange={(e) => pickPeriod(e.target.value)}
              className={`${field} mt-1 w-full`}
            >
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.frame} (default {fmt(p.start)} to {fmt(p.end)})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-base font-bold">
            Opens at
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={`${field} mt-1 w-full`}
            />
          </label>
          <label className="block text-base font-bold">
            On time until
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={`${field} mt-1 w-full`}
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-4 rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground"
        >
          Save custom times
        </button>
        {err && <p className="mt-3 text-base font-bold text-destructive">{err}</p>}
        {note && <p className="mt-3 text-base font-bold">✓ {note}</p>}
      </form>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Students with custom times ({rows.length})</h2>
        {rows.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Everyone is on the default times.</p>
        )}
        <ul className="mt-3 divide-y divide-border">
          {rows.map((s) => (
            <li key={s} className="py-3">
              <span className="text-base font-bold">{s}</span>
              <ul className="mt-1 flex flex-col gap-1">
                {PERIODS.filter((p) => custom[s]![p.id]).map((p) => {
                  const w = custom[s]![p.id]!;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm">
                        {p.frame}: {fmt(w.start)} to {fmt(w.end)}
                      </span>
                      <button
                        className={btn}
                        onClick={() =>
                          apply(
                            setCustomTimes(custom, [s], p.id, null),
                            `${displayName(s, students)} is back on the default ${p.frame} time`,
                          )
                        }
                      >
                        Reset to default
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
