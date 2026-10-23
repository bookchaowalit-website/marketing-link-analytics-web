import { handleRpc, type DataTool } from "@/lib/mcp";
import { RANGES, REPORTS, reportCsv, rowsForRange, type Range } from "@/lib/report";
import { SITE_URL } from "@/lib/site";

export const runtime = "edge";

const APP = {
  name: "Link Analytics",
  description: "Illustrative click report for short links (sample data).",
  url: SITE_URL,
};

const rangeSchema = { type: "object", properties: { range: { type: "string", enum: RANGES, default: "7d" } } };

/** The range argument, defaulting to 7d like the page; anything else is an argument error. */
function rangeOf(args: Record<string, unknown>): Range | { error: string } {
  const range = args.range ?? "7d";
  return RANGES.includes(range as Range) ? (range as Range) : { error: `Unknown range: ${String(range)} (use ${RANGES.join(", ")})` };
}

// The same illustrative sample figures the page renders; nothing here is measured.
const TOOLS: DataTool[] = [
  {
    name: "get_report",
    description: "Sample click report for a range (24h, 7d, 30d): headline figures and per-link rows. Illustrative data, not measured.",
    inputSchema: rangeSchema,
    call: (args) => {
      const range = rangeOf(args);
      if (typeof range !== "string") return range;
      return JSON.stringify({ range, sample: true, ...REPORTS[range], rows: rowsForRange(range) });
    },
  },
  {
    name: "get_report_csv",
    description: "The sample report as the CSV the page's download button saves.",
    inputSchema: rangeSchema,
    call: (args) => {
      const range = rangeOf(args);
      return typeof range === "string" ? reportCsv(range) : range;
    },
  },
];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const response = handleRpc(body, APP, TOOLS);
  if (response === null) return new Response(null, { status: 202 });
  return Response.json(response);
}
