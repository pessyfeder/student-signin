import { useState, type FormEvent } from "react";
import { addStudent, saveStudents } from "@/lib/frames";

export function AdminStudents({
  students,
  onChange,
}: {
  students: string[];
  onChange: (list: string[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [addErr, setAddErr] = useState("");
  const [added, setAdded] = useState("");

  function onAddStudent(e: FormEvent) {
    e.preventDefault();
    const r = addStudent(students, newName);
    if ("error" in r) {
      setAddErr(r.error);
      setAdded("");
      return;
    }
    saveStudents(r.list);
    onChange(r.list);
    setAdded(`${r.list[r.list.length - 1]} added`);
    setNewName("");
    setAddErr("");
  }

  return (
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
  );
}
