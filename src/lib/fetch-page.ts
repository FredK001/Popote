import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateAddress } from "./private-address";

export class FetchPageError extends Error {
  constructor(readonly reason: "invalid_url" | "blocked" | "unreachable" | "not_html" | "too_large") {
    super(reason);
  }
}

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

async function assertPublicHost(url: URL) {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new FetchPageError("invalid_url");
  if (url.port && !["80", "443"].includes(url.port)) throw new FetchPageError("blocked");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new FetchPageError("unreachable");
  if (addresses.some(isPrivateAddress)) throw new FetchPageError("blocked");
}

/**
 * Fetches a public web page server-side for the link import, without letting
 * a link reach internal addresses (SSRF): http(s) only, public IPs only (checked
 * at every redirect), 8 s timeout, 2 MB max, HTML only.
 */
export async function fetchPage(raw: string): Promise<{ url: string; html: string }> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchPageError("invalid_url");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "PopoteBot/1.0 (+recipe import)", accept: "text/html,application/xhtml+xml" },
      });
    } catch {
      throw new FetchPageError("unreachable");
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) throw new FetchPageError("unreachable");
    if (!/html/i.test(res.headers.get("content-type") ?? "")) throw new FetchPageError("not_html");
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new FetchPageError("too_large");

    const reader = res.body?.getReader();
    if (!reader) throw new FetchPageError("unreachable");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new FetchPageError("too_large");
      }
      chunks.push(value);
    }
    return { url: url.toString(), html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new FetchPageError("unreachable");
}
