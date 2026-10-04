import { TabBar } from "@/components/ui/TabBar";
import { requireProfile } from "@/lib/auth";

/** Main app screens: signed-in, onboarded, with the bottom tab bar. */
export default async function TabsLayout({ children }: LayoutProps<"/">) {
  await requireProfile();
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[430px] pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </div>
      <TabBar />
    </>
  );
}
