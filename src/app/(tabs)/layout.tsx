import { TabBar } from "@/components/ui/TabBar";

/**
 * Main app screens with the bottom tab bar. Sign-in is enforced by the proxy and pages
 * check the profile themselves, so switching tabs never waits on this layout.
 */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[430px] pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </div>
      <TabBar />
    </>
  );
}
