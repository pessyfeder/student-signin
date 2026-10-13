import { describe, expect, it } from "vitest";

import { PERIODS, clockEmoji, currentPeriod, evaluateSignIn, nextPeriod } from "@/lib/frames";

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

describe("clockEmoji", () => {
  it("shows the clock face for the nearest half hour", () => {
    expect(clockEmoji(t(1, 0))).toBe("🕐");
    expect(clockEmoji(t(10, 7))).toBe("🕙");
    expect(clockEmoji(t(10, 20))).toBe("🕥");
    expect(clockEmoji(t(12, 0))).toBe("🕛");
    expect(clockEmoji(t(0, 10))).toBe("🕛");
    expect(clockEmoji(t(13, 27))).toBe("🕜");
    expect(clockEmoji(t(23, 50))).toBe("🕛");
  });
});
