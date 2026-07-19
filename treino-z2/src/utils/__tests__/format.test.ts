import { describe, expect, it } from "vitest";
import { formatDuration, formatPace } from "../format";

describe("formatPace", () => {
  it("formats minutes and seconds per km", () => {
    expect(formatPace(4.5)).toBe("4:30/km");
  });

  it("returns a dash for null", () => {
    expect(formatPace(null)).toBe("–");
  });
});

describe("formatDuration", () => {
  it("formats under an hour as M:SS", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats an hour or more as H:MM:SS", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("returns a dash for null", () => {
    expect(formatDuration(null)).toBe("–");
  });

  it("rounds fractional seconds", () => {
    expect(formatDuration(125.6)).toBe("2:06");
  });
});
