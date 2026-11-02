import type { Metadata } from "next";
import SetPasswordForm from "@/components/admin/SetPasswordForm";

export const metadata: Metadata = { title: "Set your password" };

export default function SetPasswordPage() {
  return (
    <main className="a-page a-narrow">
      <h1 className="a-title">Set your password</h1>
      <p className="a-muted">Tappioca’s Fic Archive · Admin</p>
      <SetPasswordForm />
    </main>
  );
}
