import { metadataOptions, resourceMetadata } from "@/lib/mcp/metadata";

// Some clients look up the origin-level document first: same content.
export { resourceMetadata as GET, metadataOptions as OPTIONS };
