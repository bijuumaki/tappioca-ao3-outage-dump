import type { Metadata } from "next";
import SignInForm from "@/components/admin/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="a-page a-narrow">
      <h1 className="a-title">Sign in</h1>
      <p className="a-muted">Tappioca’s Fic Archive · Admin</p>
      <SignInForm notice={error === "not-admin" ? "That account isn’t the admin." : undefined} />
    </main>
  );
}
