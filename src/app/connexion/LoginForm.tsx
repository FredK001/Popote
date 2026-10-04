"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { format, t } from "@/messages";
import { sendMagicLink, signInWithGoogle, verifyCode, type LoginState } from "./actions";

type LoginFormProps = { next: string; initialError?: string };

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [restart, setRestart] = useState(0);
  return <LoginFlow key={restart} next={next} initialError={initialError} onRestart={() => setRestart((n) => n + 1)} />;
}

function LoginFlow({ next, initialError, onRestart }: LoginFormProps & { onRestart: () => void }) {
  const [sendState, send, sending] = useActionState<LoginState, FormData>(sendMagicLink, {
    step: "form",
    error: initialError,
  });
  const [codeState, verify, verifying] = useActionState<LoginState, FormData>(verifyCode, {
    step: "sent",
    email: "",
  });

  if (sendState.step === "sent") {
    const email = sendState.email;
    return (
      <div>
        <h1 className="font-title text-display">{t.auth.checkTitle}</h1>
        <p className="mt-3 text-encre-2">{format(t.auth.checkLead, { email })}</p>

        <form action={verify} className="mt-8 space-y-3">
          <p className="text-small text-encre-2">{t.auth.codeLead}</p>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <Field
            label={t.auth.code}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6,10}"
            maxLength={10}
            error={codeState.error}
          />
          <Button type="submit" variant="secondary" block disabled={verifying}>
            {t.auth.verify}
          </Button>
        </form>

        <Button variant="text" className="mt-4" onClick={onRestart}>
          {t.auth.otherEmail}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-title text-display">{t.auth.title}</h1>
      <p className="mt-3 text-encre-2">{t.auth.lead}</p>

      {sendState.error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-card bg-erreur-soft p-3 text-small font-semibold text-erreur">
          <Icon name="alert" size={20} />
          {sendState.error}
        </p>
      )}

      <form action={send} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label={t.auth.firstName} name="first_name" autoComplete="given-name" required defaultValue={sendState.firstName} maxLength={50} />
        <Field
          label={t.auth.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={t.auth.emailPlaceholder}
          defaultValue={sendState.email}
        />
        <Button type="submit" icon="link" block disabled={sending}>
          {sending ? t.auth.sending : t.auth.sendLink}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-small text-encre-3" aria-hidden="true">
        <span className="h-px flex-1 bg-trait" />
        {t.auth.or}
        <span className="h-px flex-1 bg-trait" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="secondary" block>
          {t.auth.google}
        </Button>
      </form>
    </div>
  );
}
