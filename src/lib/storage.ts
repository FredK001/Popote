import { publicEnv } from "@/lib/env";

export type Bucket = "recipe-photos" | "avatars";

/** Public URL of a file in a public bucket. */
export function publicFileUrl(bucket: Bucket, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.supabaseUrl()}/storage/v1/object/public/${bucket}/${path}`;
}
