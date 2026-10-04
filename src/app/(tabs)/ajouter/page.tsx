import { redirect } from "next/navigation";

// Phase 1: manual entry only. The AI add screen (photo, voice, link, free text) comes in phase 3.
export default function AddPage() {
  redirect("/recette/nouvelle");
}
