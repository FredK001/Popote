import { getPublicOrigin, metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";
import { publicEnv } from "@/lib/env";

/** Path of the RFC 9728 document for the /mcp resource (path-suffixed, as MCP clients look it up). */
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

/**
 * Protected Resource Metadata for /mcp: the resource is the connector URL itself,
 * and tokens come from the Supabase Auth OAuth 2.1 server (discovery, dynamic
 * client registration, PKCE).
 */
export function resourceMetadata(req: Request) {
  return protectedResourceHandler({
    authServerUrls: [`${publicEnv.supabaseUrl()}/auth/v1`],
    resourceUrl: `${getPublicOrigin(req)}/mcp`,
  })(req);
}

export const metadataOptions = metadataCorsOptionsRequestHandler();
