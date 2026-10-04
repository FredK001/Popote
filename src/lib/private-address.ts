import { isIP } from "node:net";

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses (IPv4 and IPv6). */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateV4(address);
  if (version === 6) {
    const a = address.toLowerCase();
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateV4(mapped[1]);
    return (
      a === "::" || a === "::1" ||
      a.startsWith("fc") || a.startsWith("fd") || // unique local
      /^fe[89ab]/.test(a) || // link-local
      a.startsWith("ff") || // multicast
      a.startsWith("64:ff9b:") || // NAT64
      a.startsWith("2001:db8") // documentation
    );
  }
  return true;
}

function isPrivateV4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}
