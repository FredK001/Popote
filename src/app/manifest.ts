import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";
import { THEME_COLOR } from "@/lib/theme";
import { t } from "@/messages";

/** Web app manifest: opens full screen (no browser bar) once added to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: t.meta.description,
    lang: "fr",
    start_url: "/carnet",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

