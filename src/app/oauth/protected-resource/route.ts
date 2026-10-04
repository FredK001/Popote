import { metadataOptions, resourceMetadata } from "@/lib/mcp/metadata";

/**
 * Served at /.well-known/oauth-protected-resource(/mcp) through a rewrite in
 * next.config.ts: dot-folders under src/app are not reliably bundled on Netlify.
 */
export { resourceMetadata as GET, metadataOptions as OPTIONS };
