import { describe, expect, it } from "vitest";
import { chartRows, csvCell, formatChange, RANGES, REPORTS, reportCsv, rowsForRange } from "@/lib/report";

describe("rowsForRange", () => {
  it("always adds up to the headline click count", () => {
    for (const range of RANGES) {
      const rows = rowsForRange(range);
      expect(rows.reduce((sum, row) => sum + row.clicks, 0)).toBe(REPORTS[range].clicks);
    }
  });

  it("scales with the selected window", () => {
    expect(rowsForRange("30d")[0].clicks).toBeGreaterThan(rowsForRange("24h")[0].clicks);
  });

  it("distributes remainders to the largest fractions", () => {
    const rows = rowsForRange("24h", [
      { name: "a", destination: "x", share: 1, status: "active" },
      { name: "b", destination: "x", share: 1, status: "active" },
      { name: "c", destination: "x", share: 1, status: "active" },
    ]);
    expect(rows.map((row) => row.clicks).sort()).toEqual([401, 401, 402]);
  });
});

describe("formatting", () => {
  it("formats signed percentage changes", () => {
    expect(formatChange(8.2)).toBe("+8.2%");
    expect(formatChange(-3)).toBe("−3.0%");
  });

  it("exports a CSV with a header and one row per link", () => {
    const csv = reportCsv("7d").trim().split("\n");
    expect(csv[0]).toBe("short_link,destination,clicks,share_percent,status,range");
    expect(csv).toHaveLength(4);
    expect(csv[1].startsWith("/go/github,https://github.com/bookchaowalit,")).toBe(true);
  });
});

describe("chartRows", () => {
  it("labels every bar oldest-first and ends at now", () => {
    const rows = chartRows("24h");
    expect(rows).toHaveLength(REPORTS["24h"].bars.length);
    expect(rows[0].label).toBe("−24h to −22h");
    expect(rows.at(-1)?.label).toBe("−2h to now");
    expect(rows.map((row) => row.volume)).toEqual(REPORTS["24h"].bars);
  });

  it("switches to days for longer windows", () => {
    expect(chartRows("30d")[0].label).toBe("−30d to −27.5d");
    expect(chartRows("7d").at(-1)?.label).toBe("−14h to now");
  });
});

describe("edge cases", () => {
  it("does not show a minus sign on a change that rounds to zero", () => {
    expect(formatChange(-0.04)).toBe("+0.0%");
    expect(formatChange(-0)).toBe("+0.0%");
    expect(formatChange(-0.05)).toBe("−0.1%");
  });

  it("renders a dash instead of NaN% or Infinity%", () => {
    expect(formatChange(Number.NaN)).toBe("—");
    expect(formatChange(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("quotes CSV cells that contain a lone CR or a line separator", () => {
    expect(csvCell("a\rb")).toBe('"a\rb"');
    expect(csvCell("a\u2028b")).toBe('"a\u2028b"');
    expect(csvCell("plain")).toBe("plain");
  });
});
