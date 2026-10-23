/**
 * Minimal JSON-RPC 2.0 handler for the app's /api/mcp endpoint.
 *
 * It only exposes static, public information about this app. There is no
 * user data behind it, so the single tool returns the app descriptor.
 */
export type JsonRpcId = number | string | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

export type AppDescriptor = { name: string; description: string; url: string };

/** An extra tool backed by the app's own data; `call` returns MCP text or an argument error. */
export type DataTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  call: (args: Record<string, unknown>) => string | { error: string };
};

export const PROTOCOL_VERSION = "2024-11-05";
export const TOOL_NAME = "get_app_info";

function isRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.jsonrpc === "2.0" && typeof candidate.method === "string";
}

function toolNameOf(params: unknown): unknown {
  if (typeof params !== "object" || params === null) return undefined;
  return (params as Record<string, unknown>).name;
}

function toolArgsOf(params: unknown): Record<string, unknown> {
  if (typeof params !== "object" || params === null) return {};
  const args = (params as Record<string, unknown>).arguments;
  return typeof args === "object" && args !== null && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
}

function error(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Returns null for notifications (requests without an id), which get no reply. */
export function handleRpc(body: unknown, app: AppDescriptor, tools: readonly DataTool[] = []): JsonRpcResponse | null {
  if (!isRequest(body)) return error(null, -32600, "Invalid Request");
  const id = body.id ?? null;
  const isNotification = body.id === undefined;

  switch (body.method) {
    case "initialize":
      return { jsonrpc: "2.0", id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: app.name, version: "1.0.0" } } };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            { name: TOOL_NAME, description: `Describe the ${app.name} app`, inputSchema: { type: "object", properties: {} } },
            ...tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
          ],
        },
      };
    case "tools/call": {
      const name = toolNameOf(body.params);
      if (name === TOOL_NAME) return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(app) }] } };
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) return error(id, -32602, `Unknown tool: ${String(name)}`);
      const output = tool.call(toolArgsOf(body.params));
      if (typeof output !== "string") return error(id, -32602, output.error);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: output }] } };
    }
    default:
      if (isNotification) return null;
      return error(id, -32601, `Method not found: ${body.method}`);
  }
}
