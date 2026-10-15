import { describe, expect, it } from "vitest";

import {
  AUTO_LOCK_MS,
  BACKUP_EVERY_MS,
  isBackupDue,
  earliestArrivals,
  recordMinutes,
  weekStart,
  PERIODS,
  isUnlocked,
  recordsToCsv,
  displayName,
  handAngles,
  currentPeriod,
  evaluateSignIn,
  nextPeriod,
  addStudent,
} from "@/lib/frames";

const t = (h: number, m: number, s = 0) => h * 60 + m + s / 60;
const [arrival, recess, lunch] = PERIODS;

describe("currentPeriod", () => {
  it("is closed before 10:00", () => expect(currentPeriod(t(9, 59))).toBeNull());
  it("opens at each start time and closes 10 minutes after the end time", () => {
    const windows: [string, [number, number], [number, number]][] = [
      ["arrival", [10, 0], [10, 15]],
      ["recess", [12, 0], [12, 5]],
      ["lunch", [13, 25], [13, 32]],
      ["recess2", [15, 25], [15, 30]],
    ];
    for (const [id, [sh, sm], [eh, em]] of windows) {
      const close = eh * 60 + em + 10;
      expect(currentPeriod(t(sh, sm))?.id).toBe(id);
      expect(currentPeriod(t(eh, em, 59))?.id).toBe(id);
      expect(currentPeriod(close + 59 / 60)?.id).toBe(id);
      expect(currentPeriod(close + 1)).toBeNull();
    }
  });
  it("is closed between windows", () => {
    expect(currentPeriod(t(11, 0))).toBeNull();
    expect(currentPeriod(t(12, 16))).toBeNull();
    expect(currentPeriod(t(14, 0))).toBeNull();
  });
  it("is closed after the last window and stays closed", () => {
    expect(currentPeriod(t(15, 41))).toBeNull();
    expect(currentPeriod(t(21, 12))).toBeNull();
    expect(nextPeriod(t(15, 41))).toBeNull();
  });
});

describe("evaluateSignIn", () => {
  it("reports minutes early before the cutoff", () => {
    const r = evaluateSignIn(arrival!, t(10, 7));
    expect(r).toMatchObject({ status: "early", minutes: 8, late: false });
    expect(r.detail).toBe("You signed in 8 min early");
  });
  it("is on time at the cutoff minute", () => {
    expect(evaluateSignIn(arrival!, t(10, 15)).status).toBe("ontime");
    expect(evaluateSignIn(recess!, t(12, 5, 0.5)).late).toBe(false);
    expect(evaluateSignIn(arrival!, t(10, 15, 59)).status).toBe("ontime");
    expect(evaluateSignIn(arrival!, t(10, 16, 0))).toMatchObject({ status: "late", minutes: 1 });
  });
  it("reports minutes late after the cutoff", () => {
    const r = evaluateSignIn(arrival!, t(10, 20));
    expect(r).toMatchObject({ status: "late", minutes: 5, late: true });
    expect(r.detail).toBe("You signed in 5 min late");
  });
  it("uses the after-lunch cutoff of 1:32", () => {
    expect(evaluateSignIn(lunch!, t(13, 27)).status).toBe("early");
    expect(evaluateSignIn(lunch!, t(13, 40)).late).toBe(true);
  });
});

describe("handAngles", () => {
  it("points the hands at the exact time", () => {
    expect(handAngles(t(3, 0))).toEqual({ hour: 90, minute: 0, second: 0 });
    expect(handAngles(t(10, 20))).toEqual({ hour: 310, minute: 120, second: 0 });
    expect(handAngles(t(12, 0))).toEqual({ hour: 0, minute: 0, second: 0 });
    expect(handAngles(t(13, 30))).toEqual({ hour: 45, minute: 180, second: 0 });
  });
  it("moves the second hand with the seconds", () => {
    expect(handAngles(t(10, 20, 15)).second).toBe(90);
    expect(handAngles(t(10, 20, 45)).second).toBe(270);
  });
});

describe("displayName", () => {
  const roster = ["Rivka Stein", "Miriam Gold", "Leah Weiss"];
  it("uses the first name when it is unique", () => {
    expect(displayName("Rivka Stein", roster)).toBe("Rivka");
  });
  it("adds the surname initial when a first name is shared", () => {
    const r = ["Rivka Stein", "Rivka Gold", "Leah Weiss"];
    expect(displayName("Rivka Stein", r)).toBe("Rivka S.");
    expect(displayName("Rivka Gold", r)).toBe("Rivka G.");
    expect(displayName("Leah Weiss", r)).toBe("Leah");
  });
  it("uses the full name when first name and initial are both shared", () => {
    const r = ["Rivka Stein", "Rivka Samuels", "Leah Weiss"];
    expect(displayName("Rivka Stein", r)).toBe("Rivka Stein");
    expect(displayName("Rivka Samuels", r)).toBe("Rivka Samuels");
  });
});

describe("isUnlocked", () => {
  it("locks after the inactivity period", () => {
    const now = 1_000_000_000;
    expect(isUnlocked(null, now)).toBe(false);
    expect(isUnlocked(String(now - 1000), now)).toBe(true);
    expect(isUnlocked(String(now - AUTO_LOCK_MS - 1), now)).toBe(false);
    expect(isUnlocked("1", now)).toBe(false);
  });
});

describe("recordsToCsv", () => {
  it("writes one row per sign-in with a header", () => {
    const csv = recordsToCsv({
      "Mon Oct 12 2026|arrival|Rivka Stein": {
        text: "",
        late: false,
        at: "10:07 AM",
        status: "early",
      },
      "Mon Oct 12 2026|recess|Leah Weiss": {
        text: "",
        late: true,
        at: "11:40 AM",
        status: "late",
      },
    });
    expect(csv).toBe(
      "Date,Window,Student,Time,Status\n" +
        "2026-10-12,Good Morning,Rivka Stein,10:07 AM,early\n" +
        "2026-10-12,After Yiddish Recess,Leah Weiss,11:40 AM,late\n",
    );
  });
});

describe("isBackupDue", () => {
  const now = 10 * BACKUP_EVERY_MS;
  it("is not due within a week of the last backup", () => {
    expect(isBackupDue(String(now - BACKUP_EVERY_MS + 1), null, now)).toBe(false);
  });
  it("is due a week after the last backup", () => {
    expect(isBackupDue(String(now - BACKUP_EVERY_MS), null, now)).toBe(true);
  });
  it("counts from first use when there has never been a backup", () => {
    expect(isBackupDue(null, String(now - 2 * 24 * 60 * 60 * 1000), now)).toBe(false);
    expect(isBackupDue(null, String(now - BACKUP_EVERY_MS), now)).toBe(true);
  });
  it("is not due when nothing is recorded", () => expect(isBackupDue(null, null, now)).toBe(false));
});

describe("weekly earliest arrival", () => {
  it("reads minutes from a saved time label", () => {
    expect(recordMinutes({ text: "", late: false, at: "10:05 AM" })).toBe(605);
    expect(recordMinutes({ text: "", late: false, at: "3:26 PM" })).toBe(926);
    expect(recordMinutes({ text: "", late: false, at: "12:01 PM" })).toBe(721);
    expect(recordMinutes({ text: "", late: false })).toBeNull();
  });
  it("starts weeks on Sunday", () => {
    expect(weekStart("Wed Oct 14 2026")).toBe("Sun Oct 11 2026");
    expect(weekStart("Sun Oct 11 2026")).toBe("Sun Oct 11 2026");
    expect(weekStart("Sat Oct 17 2026")).toBe("Sun Oct 11 2026");
  });
  it("keeps the arrival furthest before the end time", () => {
    const rec = (at: string) => ({ text: "", late: false, at });
    const records = {
      "Mon Oct 12 2026|arrival|Rivka": rec("10:10 AM"),
      "Tue Oct 13 2026|arrival|Rivka": rec("10:02 AM"),
      "Wed Oct 14 2026|arrival|Rivka": rec("10:20 AM"),
    };
    const [row] = earliestArrivals(
      records,
      ["Rivka"],
      ["Mon Oct 12 2026", "Tue Oct 13 2026", "Wed Oct 14 2026"],
    );
    expect(row?.cells[0]).toEqual({ at: "10:02 AM", before: 13 });
    expect(row?.cells[1]).toBeNull();
  });
});

describe("addStudent name rules", () => {
  const ok = (n: string) => "list" in addStudent([], n);
  it("accepts letters, spaces, apostrophes and hyphens", () => {
    expect(ok("Rivka Stein")).toBe(true);
    expect(ok("Sarah-Leah O'Brien")).toBe(true);
    expect(ok("Chaya’le Müller")).toBe(true);
  });
  it("rejects digits and other symbols", () => {
    for (const n of ["Rivka2", "Rivka_S", "Rivka.", "R!vka", "Rivka@home", "Rivka, S", "Rivka 😀"])
      expect(addStudent([], n)).toHaveProperty("error");
  });
});

describe("custom arrival times", () => {
  it("overrides only the chosen student's window", async () => {
    const { periodsFor, setCustomTimes, currentPeriod: cp } = await import("@/lib/frames");
    const custom = setCustomTimes({}, ["Dina"], "arrival", { start: 630, end: 645 });
    expect(cp(t(10, 35), periodsFor("Dina", custom))?.id).toBe("arrival");
    expect(cp(t(10, 35), periodsFor("Other", custom))).toBeNull();
    expect(setCustomTimes(custom, ["Dina"], "arrival", null)).toEqual({});
  });
});

describe("time input parsing", () => {
  it("reads HH:MM values", async () => {
    const { parseTimeInput, toTimeInput } = await import("@/lib/frames");
    expect(parseTimeInput("10:30")).toBe(630);
    expect(parseTimeInput("10:30:00")).toBe(630);
    expect(parseTimeInput("")).toBeNull();
    expect(toTimeInput(630)).toBe("10:30");
  });
});
