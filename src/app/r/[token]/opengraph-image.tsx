import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { APP_NAME } from "@/lib/config";
import { getPublicShare } from "@/lib/shares";
import { publicFileUrl } from "@/lib/storage";
import { OG_COLORS as C } from "@/lib/theme";
import { format, t } from "@/messages";

export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/BricolageGrotesque-ExtraBold.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Figtree-SemiBold.ttf")),
]);

/** Photos are WebP, which the image renderer cannot read: convert to a JPEG data URL. */
async function photoDataUrl(path: string | null): Promise<string | null> {
  const url = publicFileUrl("recipe-photos", path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(560, 630, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Link preview for WhatsApp, iMessage, Messenger: photo, title, who sends it. */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [share, [bricolage, figtree]] = await Promise.all([getPublicShare(token), fonts]);
  const photo = share ? await photoDataUrl(share.recipe.photo_path) : null;
  const title = share?.recipe.title ?? APP_NAME;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.fond, fontFamily: "Figtree" }}>
        {photo ? (
          <img src={photo} width={560} height={630} alt="" style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", width: 560, height: 630, background: C.tomate, alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", width: 120, height: 120, borderRadius: 60, background: C.blanc }} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 56px 52px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "Bricolage", fontSize: 40, color: C.encre }}>
            <div style={{ display: "flex", width: 44, height: 44, borderRadius: 12, background: C.tomate, alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: C.blanc }} />
            </div>
            {APP_NAME}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Bricolage",
              fontSize: title.length > 40 ? 56 : 68,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: C.encre,
            }}
          >
            {title}
          </div>
          {share && (
            <div style={{ display: "flex", alignSelf: "flex-start", background: C.laiton, color: C.blanc, borderRadius: 999, padding: "14px 26px", fontSize: 30 }}>
              {format(t.publicRecipe.sends, { name: share.sender.firstName })}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bricolage, weight: 800, style: "normal" },
        { name: "Figtree", data: figtree, weight: 600, style: "normal" },
      ],
    },
  );
}
