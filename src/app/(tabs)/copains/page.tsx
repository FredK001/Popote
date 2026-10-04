import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.nav.friends };

// Friends feed arrives in phase 5.
export default function FriendsPage() {
  return <EmptyState icon="copains" title={t.placeholders.friendsTitle} lead={t.placeholders.friendsLead} />;
}
