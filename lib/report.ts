export type Range = "24h" | "7d" | "30d";
export const RANGES: Range[] = ["24h", "7d", "30d"];

export type Report = { clicks: number; links: number; ctr: number; geo: string; change: number; bars: number[] };
export type LinkRow = { name: string; destination: string; share: number; status: "active" | "quiet" };

/** Illustrative sample figures; nothing here is measured. */
export const REPORTS: Record<Range, Report> = {
  "24h": { clicks: 1204, links: 8, ctr: 2.1, geo: "TH", change: 8.2, bars: [24, 38, 29, 48, 42, 67, 54, 78, 64, 82, 74, 91] },
  "7d": { clicks: 8420, links: 24, ctr: 3.4, geo: "TH", change: 14.8, bars: [32, 46, 40, 54, 48, 68, 58, 74, 62, 84, 70, 92] },
  "30d": { clicks: 31840, links: 31, ctr: 3.8, geo: "TH", change: 22.4, bars: [22, 31, 38, 34, 52, 46, 61, 58, 76, 69, 88, 96] },
};

export const ROWS: LinkRow[] = [
  { name: "/go/github", destination: "https://github.com/bookchaowalit", share: 48, status: "active" },
  { name: "/go/resume", destination: "https://bookchaowalit.com/about", share: 37, status: "active" },
  { name: "/go/notes", destination: "https://bookchaowalit.com/knowledge", share: 15, status: "quiet" },
];

export const AXIS_START: Record<Range, string> = { "24h": "−24h", "7d": "−7d", "30d": "−30d" };

export type RowWithClicks = LinkRow & { clicks: number };

/**
 * Splits the range total across rows by share using the largest-remainder
 * method, so the table always adds up to the headline click count.
 */
export function rowsForRange(range: Range, rows: LinkRow[] = ROWS, reports: Record<Range, Report> = REPORTS): RowWithClicks[] {
  const total = reports[range].clicks;
  const shareSum = rows.reduce((sum, row) => sum + row.share, 0) || 1;
  const exact = rows.map((row) => (total * row.share) / shareSum);
  const floors = exact.map(Math.floor);
  let remainder = total - floors.reduce((sum, n) => sum + n, 0);
  const order = exact.map((value, index) => ({ index, frac: value - floors[index] })).sort((a, b) => b.frac - a.frac);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floors[index] += 1;
    remainder -= 1;
  }
  return rows.map((row, index) => ({ ...row, clicks: floors[index] }));
}

/** True when the period has nothing to chart: no clicks, or every interval at zero. */
export function hasNoClicks(report: Report): boolean {
  return report.clicks === 0 || report.bars.every((bar) => bar === 0);
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
  for (const row of rowsForRange(range, rows, reports)) lines.push([row.name, row.destination, String(row.clicks), String(row.share), row.status, range]);
  return lines.map((line) => line.map(csvCell).join(",")).join("\n") + "\n";
}

const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 168, "30d": 720 };

function formatAgo(hours: number): string {
  if (hours <= 0) return "now";
  if (hours < 48) return `−${Number(hours.toFixed(1))}h`;
  return `−${Number((hours / 24).toFixed(1))}d`;
}

export type ChartRow = { label: string; volume: number };

/**
 * Text alternative for the bar chart: one row per interval, oldest first, with
 * the bar's relative volume (percent of the chart's scale, not a click count).
 */
export function chartRows(range: Range, reports: Record<Range, Report> = REPORTS): ChartRow[] {
  const bars = reports[range].bars;
  const step = RANGE_HOURS[range] / bars.length;
  return bars.map((volume, index) => {
    const from = RANGE_HOURS[range] - index * step;
    return { label: `${formatAgo(from)} to ${formatAgo(from - step)}`, volume };
  });
}
