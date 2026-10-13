import { describe, expect, it } from "vitest";

import {
  AUTO_LOCK_MS,
  PERIODS,
  isUnlocked,
  recordsToCsv,
  displayName,
  handAngles,
  currentPeriod,
  evaluateSignIn,
  nextPeriod,
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
  const roster = ["Hindy Fisch", "Mindy Katina", "Esty Oberlander"];
  it("uses the first name when it is unique", () => {
    expect(displayName("Hindy Fisch", roster)).toBe("Hindy");
  });
  it("adds the surname initial when a first name is shared", () => {
    const r = ["Rivka Fisch", "Rivka Katina", "Esty Oberlander"];
    expect(displayName("Rivka Fisch", r)).toBe("Rivka F.");
    expect(displayName("Rivka Katina", r)).toBe("Rivka K.");
    expect(displayName("Esty Oberlander", r)).toBe("Esty");
  });
  it("uses the full name when first name and initial are both shared", () => {
    const r = ["Rivka Fisch", "Rivka Friedman", "Esty Oberlander"];
    expect(displayName("Rivka Fisch", r)).toBe("Rivka Fisch");
    expect(displayName("Rivka Friedman", r)).toBe("Rivka Friedman");
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
      "Mon Oct 12 2026|arrival|Hindy Fisch": {
        text: "",
        late: false,
        at: "10:07 AM",
        status: "early",
      },
      "Mon Oct 12 2026|recess|Esty Oberlander": {
        text: "",
        late: true,
        at: "11:40 AM",
        status: "late",
      },
    });
    expect(csv).toBe(
      "Date,Window,Student,Time,Status\n" +
        "2026-10-12,Good Morning,Hindy Fisch,10:07 AM,early\n" +
        "2026-10-12,After Yiddish Recess,Esty Oberlander,11:40 AM,late\n",
    );
  });
});
