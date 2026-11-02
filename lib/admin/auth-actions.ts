"use server";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

export type SignInState = { error: string | null };

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don’t match." };
  redirect("/admin");
}

/* Signs out this device only; other devices stay signed in. */
export async function signOut(): Promise<void> {
  const db = await createSessionClient();
  await db.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}

export type SetPasswordState = { error: string | null };

/* The invite or reset link signs the browser in with one-time tokens; this saves them as a session and sets the password. */
export async function setPassword(_prev: SetPasswordState, form: FormData): Promise<SetPasswordState> {
  const access_token = String(form.get("access_token") ?? "");
  const refresh_token = String(form.get("refresh_token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords don’t match." };
  const db = await createSessionClient();
  const { error: sessionError } = await db.auth.setSession({ access_token, refresh_token });
  if (sessionError) return { error: "This link has expired. Ask for a new one." };
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: "That password couldn’t be saved. Try a different one." };
  redirect("/admin");
}
