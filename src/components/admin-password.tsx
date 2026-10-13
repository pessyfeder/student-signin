import { useState, type FormEvent } from "react";
import { hashPassword } from "@/lib/frames";

export function AdminPassword() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState(false);

  function fail(m: string) {
    setBad(true);
    setMsg(m);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = next.trim();
    if (!cur.trim() || !n) return fail("Please fill in every box");
    if (n !== again.trim()) return fail("The new passwords don't match");
    const stored = localStorage.getItem("signin-pw");
    if (stored && stored !== (await hashPassword(cur.trim())))
      return fail("Current password is incorrect");
    localStorage.setItem("signin-pw", await hashPassword(n));
    setCur("");
    setNext("");
    setAgain("");
    setBad(false);
    setMsg("Password changed");
  }

  const field =
    "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-4 focus:ring-ring";
  const on = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    setMsg("");
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
    >
      <h2 className="text-xl font-bold">Change password</h2>
      <label htmlFor="pw-cur" className="mt-4 block text-sm font-bold">
        Current password
      </label>
      <input
        id="pw-cur"
        type="password"
        autoComplete="off"
        value={cur}
        onChange={on(setCur)}
        className={field}
      />
      <label htmlFor="pw-new" className="mt-4 block text-sm font-bold">
        New password
      </label>
      <input
        id="pw-new"
        type="password"
        autoComplete="off"
        value={next}
        onChange={on(setNext)}
        className={field}
      />
      <label htmlFor="pw-again" className="mt-4 block text-sm font-bold">
        New password again
      </label>
      <input
        id="pw-again"
        type="password"
        autoComplete="off"
        value={again}
        onChange={on(setAgain)}
        className={field}
      />
      {msg && (
        <p className={`mt-3 text-base font-bold ${bad ? "text-destructive" : ""}`}>
          {bad ? msg : `✓ ${msg}`}
        </p>
      )}
      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-lg font-bold text-primary-foreground"
      >
        Change password
      </button>
    </form>
  );
}
