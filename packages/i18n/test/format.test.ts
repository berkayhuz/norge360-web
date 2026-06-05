import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatList,
  formatNumber,
  formatPercent,
  formatRelativeTime
} from "../src/format";

describe("format helpers", () => {
  it("formats deterministic values", () => {
    const date = new Date(Date.UTC(2024, 0, 15, 8, 30, 0));

    expect(formatDate("en-US", date, { timeZone: "UTC" })).toContain("2024");
    expect(formatDateTime("en-US", date, { timeZone: "UTC" })).toContain("2024");
    expect(formatNumber("en-US", 12345.67)).toContain("12");
    expect(formatCurrency("nb-NO", 99.9, "NOK")).toContain("99");
    expect(formatPercent("en-US", 0.25)).toContain("25");
    expect(formatList("en-US", ["A", "B", "C"])).toContain("A");
    expect(formatRelativeTime("en-US", -1, "day")).toContain("day");
  });
});
