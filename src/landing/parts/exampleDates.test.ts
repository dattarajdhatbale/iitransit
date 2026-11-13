import { describe, expect, it } from "vitest";
import { daysFromToday, isoDate, shortDate } from "./exampleDates";

describe("example dates", () => {
  it("counts days from today's local date", () => {
    const today = new Date(2026, 10, 12, 0, 30); // 12 Nov, just after midnight
    expect(isoDate(daysFromToday(0, today))).toBe("2026-11-12");
    expect(isoDate(daysFromToday(1, today))).toBe("2026-11-13");
  });
  it("rolls over month and year ends", () => {
    expect(isoDate(daysFromToday(1, new Date(2026, 10, 30)))).toBe("2026-12-01");
    expect(isoDate(daysFromToday(1, new Date(2026, 11, 31, 23, 59)))).toBe("2027-01-01");
    expect(isoDate(daysFromToday(4, new Date(2028, 1, 27)))).toBe("2028-03-02"); // leap year
  });
  it("formats like the app", () => {
    expect(shortDate(new Date(2026, 11, 5))).toBe("5 Dec");
    expect(shortDate(new Date(2027, 0, 1))).toBe("1 Jan");
    expect(isoDate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
  it("ignores the time of day", () => {
    const late = new Date(2026, 10, 12, 23, 59, 59);
    const early = new Date(2026, 10, 12, 0, 0, 1);
    expect(isoDate(daysFromToday(3, late))).toBe(isoDate(daysFromToday(3, early)));
  });
});
