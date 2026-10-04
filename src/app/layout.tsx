import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { APP_NAME } from "@/lib/config";
import { THEME_COLOR } from "@/lib/theme";
import { t } from "@/messages";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google at runtime, works offline.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: t.meta.description,
  applicationName: APP_NAME,
  // iOS: open full screen from the home screen, with the status bar over our paper background.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
