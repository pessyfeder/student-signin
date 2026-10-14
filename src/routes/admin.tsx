import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AdminAttendance } from "@/components/admin-attendance";
import { AdminBackup } from "@/components/admin-backup";
import { AdminPassword } from "@/components/admin-password";
import { AdminStudents } from "@/components/admin-students";
import {
  backupDue,
  hashPassword,
  isUnlocked,
  loadArchived,
  loadRecords,
  loadStudents,
  setSignInLocked,
  type SignIn,
} from "@/lib/frames";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin" },
      { name: "description", content: "Teacher admin: attendance, students and backup." },
    ],
  }),
  component: Admin,
});

type Tab = "attendance" | "students" | "backup" | "password";

const TABS: { id: Tab; label: string }[] = [
  { id: "attendance", label: "View Attendance" },
  { id: "students", label: "Add Student" },
  { id: "backup", label: "Backup" },
  { id: "password", label: "Change Password" },
];

function Admin() {
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("attendance");
  const [records, setRecords] = useState<{ [k: string]: SignIn }>({});
  const [students, setStudents] = useState<string[]>([]);
  const [archived, setArchived] = useState<string[]>([]);
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (isUnlocked(sessionStorage.getItem("teacher-ok"))) setOk(true);
    setChecked(true);
    // Leaving Admin (to the sign-in page, or reloading) locks it again.
    return () => sessionStorage.removeItem("teacher-ok");
  }, []);

  // Keep the session alive while the teacher is active; lock after a period of inactivity.
  useEffect(() => {
    if (!ok) return;
    setRecords(loadRecords());
    setStudents(loadStudents());
    setArchived(loadArchived());
    setDue(backupDue());
    const touch = () => sessionStorage.setItem("teacher-ok", String(Date.now()));
    const check = () => {
      if (!isUnlocked(sessionStorage.getItem("teacher-ok"))) lock();
    };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    const t = setInterval(check, 10000);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      clearInterval(t);
    };
  }, [ok]);

  function lock() {
    sessionStorage.removeItem("teacher-ok");
    setPw("");
    setRecords({});
    setTab("attendance");
    setOk(false);
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
    sessionStorage.setItem("teacher-ok", String(Date.now()));
    setSignInLocked(false);
    setErr("");
    setOk(true);
  }

  return (
    <main className="min-h-screen bg-muted p-3 sm:p-5 text-foreground">
      <div className="flex min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-3xl border-4 border-frame bg-background">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-4">
          <h1 className="text-lg font-bold">Admin</h1>
          <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold">
            {ok &&
              TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={
                    tab === t.id
                      ? "text-foreground underline underline-offset-8 decoration-2"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {t.label}
                </button>
              ))}
            {ok && (
              <button
                onClick={() => {
                  setSignInLocked(true);
                  lock();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Lock
              </button>
            )}
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
                autoComplete="off"
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
                Open admin
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                No password yet? The first one you type here becomes the password.
              </p>
            </form>
          ) : null}
          {ok && due && tab !== "backup" && (
            <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border-4 border-frame bg-card px-5 py-4">
              <p className="text-base font-bold">
                It has been a week since the last backup. Please back up the data.
              </p>
              <button
                onClick={() => setTab("backup")}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Go to Backup
              </button>
            </div>
          )}
          {!ok ? null : tab === "attendance" ? (
            <AdminAttendance records={records} students={students} />
          ) : tab === "students" ? (
            <AdminStudents
              students={students}
              archived={archived}
              onChange={(s, a) => {
                setStudents(s);
                setArchived(a);
              }}
            />
          ) : tab === "password" ? (
            <AdminPassword />
          ) : (
            <AdminBackup
              students={students}
              archived={archived}
              records={records}
              onBackedUp={() => setDue(false)}
              onRestore={(s, a, r) => {
                setStudents(s);
                setArchived(a);
                setRecords(r);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
