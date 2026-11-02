"use client";
import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/admin/auth-actions";

export default function SignInForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { error: null });
  const message = state.error ?? notice;
  return (
    <form action={action} className="a-card a-form">
      <label className="a-field">Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="a-field">Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {message && <p role="alert" className="a-alert">{message}</p>}
      <button type="submit" className="a-button-primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
