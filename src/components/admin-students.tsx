import { useState, type FormEvent } from "react";
import {
  addStudent,
  archiveStudent,
  restoreStudent,
  saveArchived,
  saveStudents,
} from "@/lib/frames";

export function AdminStudents({
  students,
  archived,
  onChange,
}: {
  students: string[];
  archived: string[];
  onChange: (students: string[], archived: string[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [addErr, setAddErr] = useState("");
  const [added, setAdded] = useState("");
  const [confirming, setConfirming] = useState("");

  function onAddStudent(e: FormEvent) {
    e.preventDefault();
    const r = addStudent(students, newName, archived);
    if ("error" in r) {
      setAddErr(r.error);
      setAdded("");
      return;
    }
    saveStudents(r.list);
    onChange(r.list, archived);
    setAdded(`${r.list[r.list.length - 1]} added`);
    setNewName("");
    setAddErr("");
  }

  function move(r: { students: string[]; archived: string[] }, note: string) {
    saveStudents(r.students);
    saveArchived(r.archived);
    onChange(r.students, r.archived);
    setConfirming("");
    setAdded(note);
    setAddErr("");
  }

  const btn = "rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-bold";

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <form onSubmit={onAddStudent} className="rounded-2xl border border-border bg-card p-5">
        <label htmlFor="new-student" className="block text-lg font-bold">
          Add a student
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="new-student"
            type="text"
            autoComplete="off"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setAddErr("");
              setAdded("");
            }}
            placeholder="First and last name"
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-4 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground"
          >
            Add student
          </button>
        </div>
        {addErr && <p className="mt-3 text-base font-bold text-destructive">{addErr}</p>}
        {added && <p className="mt-3 text-base font-bold">✓ {added}</p>}
      </form>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Students ({students.length})</h2>
        <ul className="mt-3 divide-y divide-border">
          {students.map((s) => (
            <li key={s} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="text-base font-semibold">{s}</span>
              {confirming === s ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Hide her from sign-in and attendance? Her records are kept.
                  </span>
                  <button
                    className={btn}
                    onClick={() => move(archiveStudent(students, archived, s), `${s} archived`)}
                  >
                    Yes, archive
                  </button>
                  <button className={btn} onClick={() => setConfirming("")}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button className={btn} onClick={() => setConfirming(s)}>
                  Archive
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {archived.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Archived ({archived.length})</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Not shown on sign-in or attendance. Their sign-ins stay in the CSV and backups.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {archived.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3 py-2">
                <span className="text-base font-semibold text-muted-foreground">{s}</span>
                <button
                  className={btn}
                  onClick={() => move(restoreStudent(students, archived, s), `${s} restored`)}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
