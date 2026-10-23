import { describe, expect, it } from "vitest";
import { handleRpc, TOOL_NAME } from "@/lib/mcp";

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
