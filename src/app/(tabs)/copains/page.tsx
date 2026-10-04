import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireProfile } from "@/lib/auth";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.nav.friends };

// Friends feed arrives in phase 5.
export default async function FriendsPage() {
  await requireProfile();
  return <EmptyState icon="copains" title={t.placeholders.friendsTitle} lead={t.placeholders.friendsLead} />;
}
