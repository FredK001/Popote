"use client";

import { signOut } from "@/app/connexion/actions";
import { Button } from "@/components/ui/Button";
import { t } from "@/messages";
import { clearUserCache } from "./ServiceWorker";

/** Signs out and forgets the pages and photos kept offline on this device. */
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => clearUserCache()}>
      <Button type="submit" variant="secondary" block>
        {t.auth.signOut}
      </Button>
    </form>
  );
}
