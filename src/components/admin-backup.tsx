import { useState, type ChangeEvent } from "react";
import { download } from "@/components/admin-attendance";
import {
  makeBackup,
  mergeBackup,
  saveArchived,
  saveRecords,
  saveStudents,
  type SignIn,
} from "@/lib/frames";

type Records = { [k: string]: SignIn };

export function AdminBackup({
  students,
  archived,
  records,
  onRestore,
}: {
  students: string[];
  archived: string[];
  records: Records;
  onRestore: (students: string[], archived: string[], records: Records) => void;
}) {
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState(false);

  function save() {
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    download(
      `class-signin-backup-${stamp}.json`,
      makeBackup(students, records, archived),
      "application/json",
    );
    setBad(false);
    setMsg("Backup downloaded");
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = mergeBackup(await file.text(), students, records, archived);
    if ("error" in r) {
      setBad(true);
      setMsg(r.error);
      return;
    }
    saveStudents(r.students);
    saveArchived(r.archived);
    saveRecords(r.records);
    onRestore(r.students, r.archived, r.records);
    setBad(false);
    setMsg("Backup restored");
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Backup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything is saved in this browser only. Download a backup file to keep a copy of the
        student list and all sign-ins.
      </p>
      <button
        onClick={save}
        className="mt-4 rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground"
      >
        Download backup
      </button>
      <h3 className="mt-6 text-base font-bold">Restore from a backup file</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Adds the students and sign-ins from the file. Nothing already here is deleted.
      </p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={restore}
        aria-label="Backup file"
        className="mt-3 block text-sm"
      />
      {msg && (
        <p className={`mt-4 text-base font-bold ${bad ? "text-destructive" : ""}`}>
          {bad ? msg : `✓ ${msg}`}
        </p>
      )}
    </div>
  );
}
