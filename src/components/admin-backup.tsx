import { useRef, useState, type ChangeEvent } from "react";
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

  const box = useRef<HTMLTextAreaElement>(null);
  const [pasted, setPasted] = useState("");

  function apply(text: string) {
    const r = mergeBackup(text, students, records, archived);
    if ("error" in r) {
      setBad(true);
      setMsg(r.error);
      return false;
    }
    saveStudents(r.students);
    saveArchived(r.archived);
    saveRecords(r.records);
    onRestore(r.students, r.archived, r.records);
    setBad(false);
    setMsg("Backup restored");
    return true;
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) apply(await file.text());
  }

  // Copies all data as text (paste it into a file on a USB stick, or straight into another device).
  // The text is also shown in the box so it can be copied by hand if the browser blocks the clipboard.
  async function copyData() {
    const text = makeBackup(students, records, archived);
    setPasted(text);
    try {
      await navigator.clipboard.writeText(text);
      setBad(false);
      setMsg("Data copied. Paste it into a file or onto another device");
    } catch {
      box.current?.select();
      setBad(true);
      setMsg("Could not copy automatically. Select the text in the box below and copy it");
    }
  }

  function restorePasted() {
    if (apply(pasted)) setPasted("");
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Backup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything is saved in this browser only. Download a backup file, or copy the data as text,
        to keep a copy of the student list and all sign-ins.
      </p>
      <button
        onClick={save}
        className="mt-4 rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground"
      >
        Download backup
      </button>
      <button
        onClick={copyData}
        className="ml-3 mt-4 rounded-xl border border-border bg-muted px-6 py-3 text-lg font-bold"
      >
        Copy data
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
      <h3 className="mt-6 text-base font-bold">Paste data</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        On another device, paste data copied with Copy data, then press Restore pasted data.
      </p>
      <textarea
        ref={box}
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        aria-label="Pasted data"
        rows={5}
        spellCheck={false}
        className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-4 focus:ring-ring"
      />
      <button
        onClick={restorePasted}
        disabled={!pasted.trim()}
        className="mt-3 rounded-xl border border-border bg-muted px-4 py-2 text-sm font-bold disabled:opacity-50"
      >
        Restore pasted data
      </button>
      {msg && (
        <p className={`mt-4 text-base font-bold ${bad ? "text-destructive" : ""}`}>
          {bad ? msg : `✓ ${msg}`}
        </p>
      )}
    </div>
  );
}
