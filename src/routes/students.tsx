import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  addStudent,
  hashPassword,
  isUnlocked,
  loadStudents,
  saveStudents,
} from "@/lib/frames";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Add Student" },
      { name: "description", content: "Teacher page for adding students to the class list." },
    ],
  }),
  component: Students,
});

function Students() {
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [students, setStudents] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [addErr, setAddErr] = useState("");
  const [added, setAdded] = useState("");

  useEffect(() => {
    if (isUnlocked(sessionStorage.getItem("teacher-ok"))) setOk(true);
    setChecked(true);
  }, []);

  // Same teacher session as the attendance page: stay unlocked while active, lock when idle.
  useEffect(() => {
    if (!ok) return;
    setStudents(loadStudents());
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
    setAdded("");
    setAddErr("");
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
    setErr("");
    setOk(true);
  }

  function onAddStudent(e: FormEvent) {
    e.preventDefault();
    const r = addStudent(students, newName);
    if ("error" in r) {
      setAddErr(r.error);
      setAdded("");
      return;
    }
    saveStudents(r.list);
    setStudents(r.list);
    setAdded(`${r.list[r.list.length - 1]} added`);
    setNewName("");
    setAddErr("");
  }

  return (
    <main className="min-h-screen bg-muted p-3 sm:p-5 text-foreground">
      <div className="flex min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-3xl border-4 border-frame bg-background">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h1 className="text-lg font-bold">Add Student</h1>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            {ok && (
              <button onClick={lock} className="text-muted-foreground hover:text-foreground">
                Lock
              </button>
            )}
            <Link to="/attendance" className="text-muted-foreground hover:text-foreground">
              View attendance
            </Link>
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
                Continue
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                No password yet? The first one you type here becomes the password.
              </p>
            </form>
          ) : (
            <form
              onSubmit={onAddStudent}
              className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5"
            >
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
              <p className="mt-3 text-sm text-muted-foreground">
                {students.length} students: {students.join(", ")}
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
