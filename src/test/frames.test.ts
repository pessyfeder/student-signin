import { describe, expect, it } from "vitest";

import {
  PERIODS,
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
  it("closes at 3:00 PM and stays closed", () => {
    expect(currentPeriod(t(14, 59))?.id).toBe("lunch");
    expect(currentPeriod(t(15, 0))).toBeNull();
    expect(currentPeriod(t(21, 12))).toBeNull();
    expect(nextPeriod(t(15, 0))).toBeNull();
  });
  it("switches to the next window at its start time", () => {
    expect(currentPeriod(t(10, 0))?.id).toBe("arrival");
    expect(currentPeriod(t(11, 27))?.id).toBe("arrival");
    expect(currentPeriod(t(11, 28))?.id).toBe("recess");
    expect(currentPeriod(t(13, 25))?.id).toBe("lunch");
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
    expect(evaluateSignIn(recess!, t(11, 33, 0.5)).late).toBe(false);
  });
  it("reports minutes late after the cutoff", () => {
    const r = evaluateSignIn(arrival!, t(10, 20));
    expect(r).toMatchObject({ status: "late", minutes: 5, late: true });
    expect(r.detail).toBe("You signed in 5 min late");
  });
  it("uses the after-lunch cutoff of 1:30", () => {
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
