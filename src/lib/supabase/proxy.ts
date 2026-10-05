import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { requestOrigin } from "@/lib/request-origin";

/** Paths that need a signed-in user. */
const PROTECTED = ["/carnet", "/copains", "/ajouter", "/une", "/profil", "/recette", "/courses", "/bienvenue"];

/**
 * Refreshes the Supabase session on every navigation and writes the new cookies
 * on the response. Redirects signed-out visitors away from protected pages.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No Supabase auth cookie: signed out, no need to call Supabase at all.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasSession) return guard(request, response, false);

  const supabase = createServerClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Verifies the JWT signature; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  return guard(request, response, signedIn);
}

/** Redirects signed-out visitors away from protected pages, keeping refreshed cookies. */
function guard(request: NextRequest, response: NextResponse, signedIn: boolean) {
  const { pathname, search } = request.nextUrl;
  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL(`/connexion?next=${encodeURIComponent(pathname + search)}`, requestOrigin(request));
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
