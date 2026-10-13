import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";

type Props = {
  open: boolean;
  isNew: boolean;
  // Returns an error message to show, or null when the password was accepted.
  onSubmit: (password: string) => Promise<string | null>;
  onCancel: () => void;
};

// Teacher password prompt with a masked field (window.prompt would show what is typed).
export function TeacherPasswordDialog({ open, isNew, onSubmit, onCancel }: Props) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  function close() {
    setPw("");
    setErr("");
    onCancel();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const typed = pw.trim();
    if (!typed) return;
    const problem = await onSubmit(typed);
    if (problem) setErr(problem);
    else {
      setPw("");
      setErr("");
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-frame bg-background p-6 focus:outline-none"
        >
          <form onSubmit={submit}>
            <DialogPrimitive.Title className="text-xl font-bold">
              {isNew ? "Create a teacher password" : "Teacher password"}
            </DialogPrimitive.Title>
            <input
              type="password"
              autoComplete="off"
              autoFocus
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr("");
              }}
              aria-label="Teacher password"
              placeholder="Password"
              className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-4 focus:ring-ring"
            />
            {err && <p className="mt-3 text-base font-bold text-destructive">{err}</p>}
            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-lg font-bold text-primary-foreground"
              >
                OK
              </button>
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-lg font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
