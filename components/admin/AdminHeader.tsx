import { signOut } from "@/lib/admin/auth-actions";
import AdminOptions from "./AdminOptions";
import AdminSections from "./AdminSections";

export default function AdminHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
    <header className="a-header">
      <div className="a-header-text">
        <h1 className="a-title">{title}</h1>
        <p className="a-muted">Tappioca’s Fic Archive · Admin</p>
      </div>
      <div className="a-header-actions">
        {children}
        <form action={signOut} className="a-signout-form"><button type="submit" className="a-signout a-link">Sign out</button></form>
        <AdminOptions />
      </div>
    </header>
    <AdminSections />
    </>
  );
}
