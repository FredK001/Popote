import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.nav.featured };

// Recipe of the week, most shared and monthly challenge arrive in phase 5.
export default function FeaturedPage() {
  return <EmptyState icon="une" title={t.placeholders.featuredTitle} lead={t.placeholders.featuredLead} />;
}
