import { requireProfile } from "@/lib/auth";

/** Full-screen tasks (recipe sheet, editor, cook mode): signed-in, no tab bar. */
export default async function FocusLayout({ children }: LayoutProps<"/">) {
  await requireProfile();
  return <div className="mx-auto min-h-dvh max-w-[430px]">{children}</div>;
}
