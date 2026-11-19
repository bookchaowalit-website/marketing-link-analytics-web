export type Range = "24h" | "7d" | "30d";
export const RANGES: Range[] = ["24h", "7d", "30d"];

/**
 * `bars` are the relative weight of each interval (oldest first; the sample's are its clicks); the chart turns them into whole clicks per interval
 * that add up to `clicks`. `geo` is an ISO 3166-1 alpha-2 region code; `ctr` is clicks per view, in percent.
 */
export type Report = { clicks: number; ctr: number; geo: string; change: number; bars: number[] };
export type LinkRow = { name: string; destination: string; share: number; status: "active" | "quiet" };

/**
 * One illustrative sample (nothing here is measured): clicks per day for the last 60 days, oldest first, each day
 * split into 24 hours by a fixed daily profile. Every period is cut from these same hours, so nested periods agree
 * (the last 24 hours are the last day, the 7 days hold it, the 30 days hold both), and `change` compares a period
 * with the period of the same length just before it.
 */
const SAMPLE_DAYS = [
  // The 30 days before the current month (only used for the 30-day change).
  760, 765, 770, 776, 781, 786, 791, 797, 802, 807, 812, 818, 823, 828, 833, 839, 844, 849, 854, 860, 865, 870, 875,
  881, 886, 891, 896, 902, 907, 912,
  // The current 30 days.
  900, 910, 921, 931, 942, 952, 963, 973, 984, 994, 1005, 1015, 1026, 1036, 1047, 1057, 1068, 1078, 1089, 1099, 1110,
  1120, 1200, 1150, 1180, 1190, 1230, 1210, 1256, 1204,
];
const HOUR_PROFILE = [2, 1, 1, 1, 1, 2, 3, 5, 6, 7, 7, 6, 6, 7, 7, 6, 6, 6, 5, 5, 4, 4, 3, 2];
const SAMPLE_HOURS = SAMPLE_DAYS.flatMap((day) => splitWhole(day, HOUR_PROFILE));

/**
 * Interval layout per period, on whole days where the period is days long (so the chart follows days, not a
 * saw-tooth of day and night halves): 24 hours in 12 two-hour bars, 7 days in 7 daily bars, 30 days in 10 three-day bars.
 */
export const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 168, "30d": 720 };
export const RANGE_BARS: Record<Range, number> = { "24h": 12, "7d": 7, "30d": 10 };

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

/** Hours `[end - hours, end)` of the sample, where `end` counts back from now (0 = now). */
function sampleWindow(hours: number, end = 0): number[] {
  return SAMPLE_HOURS.slice(SAMPLE_HOURS.length - end - hours, SAMPLE_HOURS.length - end);
}

/** Percent change of `current` on `previous`; NaN (shown as "—") when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number {
  return previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : Number.NaN;
}

function sampleReport(range: Range, rest: Omit<Report, "clicks" | "bars" | "change">): Report {
  const hours = RANGE_HOURS[range];
  const count = RANGE_BARS[range];
  const window = sampleWindow(hours);
  const step = hours / count;
  const bars = Array.from({ length: count }, (_, i) => sum(window.slice(i * step, (i + 1) * step)));
  const clicks = sum(bars);
  return { ...rest, clicks, change: percentChange(clicks, sum(sampleWindow(hours, hours))), bars };
}

/** `bars` here are the sample's clicks per interval, so they already add up to `clicks`. */
export const REPORTS: Record<Range, Report> = {
  "24h": sampleReport("24h", { ctr: 2.1, geo: "TH" }),
  "7d": sampleReport("7d", { ctr: 3.4, geo: "TH" }),
  "30d": sampleReport("30d", { ctr: 3.8, geo: "TH" }),
};

/**
 * `bars` on the 0-100 scale MCP clients had before the shared sample (each interval relative to the busiest one),
 * so a client that draws them as heights keeps working; the clicks themselves are in `intervals`.
 */
export function relativeBars(bars: number[]): number[] {
  const top = Math.max(0, ...bars);
  return bars.map((bar) => (top > 0 ? Math.round((bar / top) * 100) : 0));
}

export const ROWS: LinkRow[] = [
  { name: "/go/github", destination: "https://github.com/bookchaowalit", share: 48, status: "active" },
  { name: "/go/resume", destination: "https://bookchaowalit.com/about", share: 37, status: "active" },
  { name: "/go/notes", destination: "https://bookchaowalit.com/knowledge", share: 15, status: "quiet" },
];

/** `share` here is the percent of the clicks actually given to this row (whole numbers that add up to 100). */
export type RowWithClicks = LinkRow & { clicks: number };

/** Splits `total` across `weights` into whole numbers (largest-remainder method), so they add up to `total`. */
function splitWhole(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const exact = weights.map((weight) => (total * weight) / weightSum);
  const floors = exact.map(Math.floor);
  let remainder = total - floors.reduce((sum, n) => sum + n, 0);
  const order = exact.map((value, index) => ({ index, frac: value - floors[index] })).sort((a, b) => b.frac - a.frac);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floors[index] += 1;
    remainder -= 1;
  }
  return floors;
}

/**
 * Splits the range total across rows by share using the largest-remainder
 * method, so the table always adds up to the headline click count. Each row's
 * `share` is then recomputed from the clicks it was given, over the rows shown,
 * so the listed percentages add up to 100 even when only some links are passed.
 */
export function rowsForRange(range: Range, rows: LinkRow[] = ROWS, reports: Record<Range, Report> = REPORTS): RowWithClicks[] {
  // Every weight 0: there is no basis to split the total, so no row is given clicks (see hasBreakdown).
  const clicks = hasWeights(rows) ? splitWhole(reports[range].clicks, rows.map((row) => row.share)) : rows.map(() => 0);
  // No clicks given: there is no share to show (0 here; the table and CSV say so instead of showing a weight).
  const shares = clicks.some((n) => n > 0) ? splitWhole(100, clicks) : rows.map(() => 0);
  return rows.map((row, index) => ({ ...row, clicks: clicks[index], share: shares[index] }));
}

function hasWeights(rows: LinkRow[]): boolean {
  return rows.some((row) => row.share > 0);
}

/**
 * True when the period's clicks can be split per link: there are clicks and at least one link has a weight.
 * Otherwise the table shows a note and the CSV leaves share_percent (and, without weights, clicks) empty.
 */
export function hasBreakdown(range: Range, rows: LinkRow[] = ROWS, reports: Record<Range, Report> = REPORTS): boolean {
  return reports[range].clicks > 0 && hasWeights(rows);
}

/** True when the period got no clicks at all; the links, top region and chart then say so. */
export function hasNoClicks(report: Report): boolean {
  return report.clicks === 0;
}

/** True when there is nothing to draw: no intervals, or every interval at zero. Clicks may still be above 0. */
export function hasNoChartData(report: Report): boolean {
  return report.bars.every((bar) => bar === 0);
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatChange(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.abs(n).toFixed(1);
  // Sign follows the displayed value: −0.04 shows as +0.0%, not −0.0%.
  return `${n < 0 && Number(rounded) !== 0 ? "−" : "+"}${rounded}%`;
}

export function csvCell(value: string | number): string {
  const text = String(value);
  // A lone CR (or U+2028/U+2029) also ends a record in spreadsheet importers.
  return /[",\r\n\u2028\u2029]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportCsv(range: Range, rows: LinkRow[] = ROWS, reports: Record<Range, Report> = REPORTS): string {
  const lines = [["short_link", "destination", "clicks", "share_percent", "status", "range"]];
  const split = hasBreakdown(range, rows, reports);
  // Without a split the cells stay empty rather than carrying sample weights that read like real shares.
  const knownClicks = split || reports[range].clicks === 0;
  for (const row of rowsForRange(range, rows, reports)) lines.push([row.name, row.destination, knownClicks ? String(row.clicks) : "", split ? String(row.share) : "", row.status, range]);
  return lines.map((line) => line.map(csvCell).join(",")).join("\n") + "\n";
}


/** How long ago, in one unit per period like the axis: hours for the last 24 hours, days otherwise. */
function formatAgo(hours: number, range: Range): string {
  if (hours <= 0) return "now";
  if (range === "24h") return `−${Number(hours.toFixed(1))}h`;
  return `−${Number((hours / 24).toFixed(1))}d`;
}

export type ChartRow = { label: string; clicks: number };

/** Whole clicks per interval, oldest first: the period's clicks split by the interval weights, so they add up to `clicks`. */
export function bucketClicks(report: Report): number[] {
  return hasNoChartData(report) ? report.bars.map(() => 0) : splitWhole(report.clicks, report.bars);
}

/**
 * Text alternative for the chart: one row per interval, oldest first, with
 * the clicks counted in it (the rows add up to the period's clicks).
 */
export function chartRows(range: Range, reports: Record<Range, Report> = REPORTS): ChartRow[] {
  const report = reports[range];
  const clicks = bucketClicks(report);
  const step = RANGE_HOURS[range] / report.bars.length;
  return clicks.map((count, index) => {
    const from = RANGE_HOURS[range] - index * step;
    return { label: `${formatAgo(from, range)} to ${formatAgo(from - step, range)}`, clicks: count };
  });
}

/**
 * Five x-axis ticks on interval edges (start, quarters, now) for `count` intervals, with how long ago each edge is.
 * Fewer intervals give fewer ticks, never two on the same edge.
 */
export function axisTicks(range: Range, count: number): { ticks: number[]; labels: string[] } {
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(part * count)))];
  // One unit per axis (hours for a day, days otherwise), so a 7-day axis never mixes "−42h" in with days.
  const ago = (hours: number) => (hours <= 0 ? "now" : range === "24h" ? `−${Number(hours.toFixed(1))}h` : `−${Number((hours / 24).toFixed(1))}d`);
  return { ticks, labels: ticks.map((tick) => ago(RANGE_HOURS[range] * (1 - tick / Math.max(count, 1)))) };
}

const REGION_NAMES: Record<string, string> = { TH: "Thailand" };

/** The full name of a region code ("TH" → "Thailand"); unknown codes come back as given. */
export function regionName(code: string): string {
  return REGION_NAMES[code.toUpperCase()] ?? code;
}

/** The quietest and busiest intervals (first one on a tie), for the chart's text summary; null with no intervals. */
export function chartExtremes(range: Range, reports: Record<Range, Report> = REPORTS): { low: ChartRow; high: ChartRow } | null {
  const rows = chartRows(range, reports);
  if (rows.length === 0) return null;
  const pick = (better: (a: number, b: number) => boolean) => rows.reduce((best, row) => (better(row.clicks, best.clicks) ? row : best));
  return { low: pick((a, b) => a < b), high: pick((a, b) => a > b) };
}
