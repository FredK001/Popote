/**
 * Full-screen tasks (recipe sheet, editor, cook mode, add): no tab bar.
 * Sign-in is enforced by the proxy and each page checks the profile itself, so this
 * layout never waits on the database and loading skeletons show instantly.
 */
export default function FocusLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto min-h-dvh max-w-[430px]">{children}</div>;
}
