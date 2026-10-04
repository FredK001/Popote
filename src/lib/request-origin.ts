import type { NextRequest } from "next/server";

/**
 * Origin the visitor actually used (phone on the LAN, deploy preview, custom domain),
 * from the Host headers rather than the server's bind address.
 */
export function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
