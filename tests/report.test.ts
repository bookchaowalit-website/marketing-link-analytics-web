import { describe, expect, it } from "vitest";
import { axisTicks, bucketClicks, chartExtremes, chartRows, csvCell, formatChange, hasNoChartData, hasNoClicks, RANGES, regionName, REPORTS, reportCsv, rowsForRange, hasBreakdown } from "@/lib/report";

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

  it("gives each row the share of the clicks it was actually given, adding up to 100", () => {
    // Only one link passed: it gets every click, so it is 100% of them, not its sample weight of 48%.
    const one = rowsForRange("7d", [{ name: "/go/github", destination: "x", share: 48, status: "active" }]);
    expect(one.map((row) => [row.clicks, row.share])).toEqual([[8420, 100]]);
    expect(reportCsv("7d", [{ name: "/go/github", destination: "x", share: 48, status: "active" }]).split("\n")[1]).toBe("/go/github,x,8420,100,active,7d");
    // Two of three links: their percentages follow the clicks and still add up to 100.
    const two = rowsForRange("7d", [
      { name: "a", destination: "x", share: 48, status: "active" },
      { name: "b", destination: "x", share: 37, status: "active" },
    ]);
    expect(two.map((row) => row.share)).toEqual([56, 44]);
    expect(two.reduce((sum, row) => sum + row.share, 0)).toBe(100);
    // The full sample keeps its 48 / 37 / 15 split.
    for (const range of RANGES) expect(rowsForRange(range).map((row) => row.share)).toEqual([48, 37, 15]);
    // No clicks: no share either (never the sample weights); no rows: nothing.
    const quiet = { ...REPORTS, "24h": { ...REPORTS["24h"], clicks: 0 } };
    expect(rowsForRange("24h", [{ name: "a", destination: "x", share: 3, status: "active" }, { name: "b", destination: "x", share: 1, status: "quiet" }], quiet).map((row) => row.share)).toEqual([0, 0]);
    expect(rowsForRange("7d", [])).toEqual([]);
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
    // Whole clicks per interval that add up to the period's clicks, in the shape of the interval weights.
    expect(rows.map((row) => row.clicks)).toEqual([42, 66, 50, 84, 73, 117, 94, 136, 111, 143, 129, 159]);
  });

  it("adds up to the Clicks stat in every period", () => {
    for (const range of RANGES) expect(chartRows(range).reduce((sum, row) => sum + row.clicks, 0)).toBe(REPORTS[range].clicks);
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

describe("hasNoClicks and hasNoChartData", () => {
  it("keeps zero clicks apart from an empty or all-zero chart", () => {
    expect(hasNoClicks(REPORTS["7d"])).toBe(false);
    expect(hasNoClicks({ ...REPORTS["7d"], clicks: 0 })).toBe(true);
    // Clicks counted but no interval split: not "no clicks", only nothing to chart.
    expect(hasNoClicks({ ...REPORTS["7d"], bars: [0, 0, 0] })).toBe(false);
    expect(hasNoChartData({ ...REPORTS["7d"], bars: [0, 0, 0] })).toBe(true);
    expect(hasNoChartData({ ...REPORTS["7d"], bars: [] })).toBe(true);
    expect(hasNoChartData(REPORTS["7d"])).toBe(false);
  });
});

describe("chartExtremes", () => {
  it("names the quietest and busiest intervals, first one on a tie, and null with no intervals", () => {
    expect(chartExtremes("7d")).toEqual({ low: { label: "−7d to −6.4d", clicks: 370 }, high: { label: "−14h to now", clicks: 1064 } });
    const tie = { ...REPORTS, "24h": { ...REPORTS["24h"], bars: [5, 9, 5, 9] } };
    expect(chartExtremes("24h", tie)).toEqual({ low: { label: "−24h to −18h", clicks: 215 }, high: { label: "−18h to −12h", clicks: 387 } });
    expect(chartExtremes("24h", { ...REPORTS, "24h": { ...REPORTS["24h"], bars: [] } })).toBeNull();
  });
});

describe("bucketClicks", () => {
  it("gives every interval zero when there is no interval split", () => {
    expect(bucketClicks({ ...REPORTS["7d"], bars: [0, 0, 0] })).toEqual([0, 0, 0]);
    expect(bucketClicks({ ...REPORTS["7d"], clicks: 10, bars: [1, 1] })).toEqual([5, 5]);
  });
});

describe("axisTicks", () => {
  it("marks the start, the quarters and now in one unit per axis", () => {
    expect(axisTicks("24h", 12)).toEqual({ ticks: [0, 3, 6, 9, 12], labels: ["−24h", "−18h", "−12h", "−6h", "now"] });
    expect(axisTicks("7d", 12).labels).toEqual(["−7d", "−5.3d", "−3.5d", "−1.8d", "now"]);
    expect(axisTicks("30d", 12).labels).toEqual(["−30d", "−22.5d", "−15d", "−7.5d", "now"]);
  });

  it("never puts two ticks on one edge", () => {
    expect(axisTicks("7d", 2).ticks).toEqual([0, 1, 2]);
    expect(axisTicks("7d", 0)).toEqual({ ticks: [0], labels: ["−7d"] });
  });
});

describe("regionName", () => {
  it("names known region codes and keeps unknown ones", () => {
    expect(regionName("TH")).toBe("Thailand");
    expect(regionName("th")).toBe("Thailand");
    expect(regionName("ZZ")).toBe("ZZ");
  });
});

describe("zero totals (Codex 2026-11-19)", () => {
  const links = [
    { name: "/go/github", destination: "https://github.com/bookchaowalit", share: 48, status: "active" as const },
    { name: "/go/resume", destination: "https://bookchaowalit.com/about", share: 37, status: "active" as const },
  ];
  it("a period with no clicks exports clicks 0 and an empty share_percent, not the sample weights", () => {
    const quiet = { ...REPORTS, "7d": { ...REPORTS["7d"], clicks: 0 } };
    expect(hasBreakdown("7d", links, quiet)).toBe(false);
    expect(reportCsv("7d", links, quiet).split("\n").slice(1, 3)).toEqual([
      "/go/github,https://github.com/bookchaowalit,0,,active,7d",
      "/go/resume,https://bookchaowalit.com/about,0,,active,7d",
    ]);
  });
  it("links that all weigh 0 get no invented clicks: clicks and share_percent stay empty", () => {
    const zero = links.map((link) => ({ ...link, share: 0 }));
    expect(hasBreakdown("7d", zero)).toBe(false);
    expect(rowsForRange("7d", zero).map((row) => [row.clicks, row.share])).toEqual([[0, 0], [0, 0]]);
    expect(reportCsv("7d", zero).split("\n")[1]).toBe("/go/github,https://github.com/bookchaowalit,,,active,7d");
  });
});
