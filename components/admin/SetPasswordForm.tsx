"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { setPassword, type SetPasswordState } from "@/lib/admin/auth-actions";

export default function SetPasswordForm() {
  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null | undefined>(undefined);
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPassword, { error: null });

  const read = useRef<{ access: string; refresh: string } | null | undefined>(undefined);

  /* Read the one-time sign-in from the link exactly once, then clear it from the address bar. */
  useEffect(() => {
    if (read.current !== undefined) { setTokens(read.current); return; }
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    read.current = access && refresh ? { access, refresh } : null;
    setTokens(read.current);
    if (access) history.replaceState(null, "", window.location.pathname);
  }, []);

  if (tokens === undefined) return null;
  if (tokens === null) return <p role="alert" className="a-alert">This link is missing or has expired. Ask for a new invite.</p>;
  return (
    <form action={action} className="a-card a-form">
      <input type="hidden" name="access_token" value={tokens.access} />
      <input type="hidden" name="refresh_token" value={tokens.refresh} />
      <label className="a-field">New password
        <input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <label className="a-field">Type it again
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      {state.error && <p role="alert" className="a-alert">{state.error}</p>}
      <button type="submit" className="a-button-primary" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}
