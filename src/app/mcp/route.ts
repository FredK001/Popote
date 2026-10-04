import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { RESOURCE_METADATA_PATH } from "@/lib/mcp/metadata";
import { MCP_INSTRUCTIONS, registerPopoteTools, verifyAccessToken } from "@/lib/mcp/server";

/**
 * Popote's remote MCP server, added once as a connector in Claude (or ChatGPT).
 * OAuth 2.1 is handled by the Supabase Auth OAuth server; this route only checks
 * the bearer token and answers 401 with a pointer to the protected resource metadata.
 */
const handler = createMcpHandler(registerPopoteTools, {
  serverInfo: { name: "popote", version: "1.0.0" },
  instructions: MCP_INSTRUCTIONS,
});

const authenticated = withMcpAuth(handler, (_req, token) => verifyAccessToken(token), {
  required: true,
  resourceMetadataPath: RESOURCE_METADATA_PATH,
});

export { authenticated as GET, authenticated as POST, authenticated as DELETE };
