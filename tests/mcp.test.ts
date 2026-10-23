import { describe, expect, it } from "vitest";
import { handleRpc, TOOL_NAME } from "@/lib/mcp";
import { POST } from "@/app/api/mcp/route";
import { REPORTS, reportCsv, rowsForRange } from "@/lib/report";

const app = { name: "Test App", description: "A test", url: "https://example.test" };

describe("handleRpc", () => {
  it("answers initialize with server info", () => {
    const response = handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize" }, app);
    expect(response).toMatchObject({ id: 1, result: { serverInfo: { name: "Test App" } } });
  });

  it("lists the single app-info tool", () => {
    const response = handleRpc({ jsonrpc: "2.0", id: "a", method: "tools/list" }, app);
    expect(response).toMatchObject({ result: { tools: [{ name: TOOL_NAME }] } });
  });

  it("returns MCP text content for a known tool", () => {
    const response = handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: TOOL_NAME } }, app);
    expect(response).toEqual({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: JSON.stringify(app) }] } });
  });

  it("rejects unknown tools, unknown methods, and malformed requests", () => {
    expect(handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "nope" } }, app)).toMatchObject({ error: { code: -32602 } });
    expect(handleRpc({ jsonrpc: "2.0", id: 4, method: "nope" }, app)).toMatchObject({ error: { code: -32601 } });
    expect(handleRpc({ hello: "world" }, app)).toMatchObject({ id: null, error: { code: -32600 } });
  });

  it("does not reply to unknown notifications", () => {
    expect(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, app)).toBeNull();
  });
});

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id and lists the report tools", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" })).json();
    expect(body.id).toBe(7);
    expect(body.result.tools.map((tool: { name: string }) => tool.name)).toEqual([TOOL_NAME, "get_report", "get_report_csv"]);
  });

  it("get_report returns the same sample figures and rows the page shows", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: "r", method: "tools/call", params: { name: "get_report", arguments: { range: "30d" } } })).json();
    expect(body.id).toBe("r");
    const report = JSON.parse(body.result.content[0].text);
    expect(report).toMatchObject({ range: "30d", sample: true, clicks: REPORTS["30d"].clicks });
    expect(report.rows).toEqual(rowsForRange("30d"));
  });

  it("get_report defaults to the 7d window and rejects an unknown range", async () => {
    const ok = await (await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_report" } })).json();
    expect(JSON.parse(ok.result.content[0].text).range).toBe("7d");
    const bad = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_report", arguments: { range: "1y" } } })).json();
    expect(bad).toMatchObject({ id: 2, error: { code: -32602 } });
  });

  it("get_report_csv returns the CSV the download button saves", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_report_csv", arguments: { range: "24h" } } })).json();
    expect(body.result.content[0].text).toBe(reportCsv("24h"));
  });

  it("rejects an unknown tool and a malformed body", async () => {
    const unknown = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "delete_all" } })).json();
    expect(unknown).toMatchObject({ id: 4, error: { code: -32602 } });
    const parse = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect(parse.status).toBe(400);
    expect((await parse.json()).error.code).toBe(-32700);
  });

  it("answers a notification with 202 and no body", async () => {
    const res = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res.status).toBe(202);
  });
});
