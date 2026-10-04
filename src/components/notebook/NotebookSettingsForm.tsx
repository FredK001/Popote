"use client";

import { useActionState, useState } from "react";
import { saveNotebookSettings, type NotebookSettingsState } from "@/app/bienvenue/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import type { Profile, ProfileColor } from "@/lib/recipes/types";
import { publicFileUrl } from "@/lib/storage";
import { format, t } from "@/messages";
import { ColorPicker } from "./ColorPicker";
import { NotebookCover } from "./NotebookCover";
import { PhotoUpload } from "./PhotoUpload";

type Props = {
  profile: Profile;
  next: string;
  submitLabel: string;
};

/** Notebook name, cover colour and avatar, with a live preview of the cover. */
export function NotebookSettingsForm({ profile, next, submitLabel }: Props) {
  const [state, action, pending] = useActionState<NotebookSettingsState, FormData>(saveNotebookSettings, {});
  const [firstName, setFirstName] = useState(profile.first_name);
  const defaultName = format(t.onboarding.notebookDefault, { name: profile.first_name || "…" });
  const [notebookName, setNotebookName] = useState(profile.notebook_name ?? (profile.first_name ? defaultName : ""));
  const [cover, setCover] = useState<ProfileColor>(profile.notebook_color);
  const [avatarColor, setAvatarColor] = useState<ProfileColor>(profile.avatar_color);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);

  const photo = avatarPath ? publicFileUrl("avatars", avatarPath) : avatarUrl;
  const displayName = firstName.trim() || "?";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="avatar_path" value={avatarPath ?? ""} />
      <input type="hidden" name="avatar_url" value={avatarPath ? "" : (avatarUrl ?? "")} />

      <div aria-label={t.onboarding.preview}>
        <NotebookCover
          color={cover}
          title={notebookName.trim() || defaultName}
          subtitle={t.notebook.brandNew}
          corner={<Avatar name={displayName} tone={avatarColor} size="l" photoUrl={photo} />}
        />
      </div>

      <Field
        label={t.onboarding.firstName}
        name="first_name"
        required
        maxLength={50}
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => {
          const value = e.target.value;
          // Keep the default notebook name in sync until the user edits it.
          if (notebookName === format(t.onboarding.notebookDefault, { name: firstName }) || !notebookName) {
            setNotebookName(value ? format(t.onboarding.notebookDefault, { name: value }) : "");
          }
          setFirstName(value);
        }}
      />
      <Field
        label={t.onboarding.notebookName}
        name="notebook_name"
        required
        maxLength={60}
        value={notebookName}
        onChange={(e) => setNotebookName(e.target.value)}
      />

      <ColorPicker legend={t.onboarding.cover} name="notebook_color" value={cover} onChange={setCover} />

      <fieldset className="space-y-3">
        <legend className="mb-2 text-small font-semibold text-encre-2">{t.onboarding.avatar}</legend>
        <div className="flex items-center gap-4">
          <Avatar name={displayName} tone={avatarColor} size="xl" photoUrl={photo} />
          <div className="space-y-2">
            <PhotoUpload
              bucket="avatars"
              userId={profile.id}
              maxSide={512}
              label={t.onboarding.avatarPhoto}
              busyLabel={t.recipeForm.photoUploading}
              errorLabel={t.recipeForm.photoError}
              onUploaded={setAvatarPath}
            />
            {photo && (
              <Button
                variant="text"
                onClick={() => {
                  setAvatarPath(null);
                  setAvatarUrl(null);
                }}
              >
                {t.onboarding.avatarRemove}
              </Button>
            )}
          </div>
        </div>
        {!photo && <ColorPicker legend={t.onboarding.avatarColor} name="avatar_color" value={avatarColor} onChange={setAvatarColor} />}
        {photo && <input type="hidden" name="avatar_color" value={avatarColor} />}
      </fieldset>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-card bg-erreur-soft p-3 text-small font-semibold text-erreur">
          <Icon name="alert" size={20} />
          {state.error}
        </p>
      )}

      <Button type="submit" block disabled={pending}>
        {pending ? t.onboarding.saving : submitLabel}
      </Button>
    </form>
  );
}
