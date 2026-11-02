import AdminThemeBoot from "./AdminThemeBoot";

/* The admin look (four themes, lowercase text) around any admin page, including the sign-in page. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin" data-admin-theme="day" suppressHydrationWarning>
      <AdminThemeBoot />
      {children}
    </div>
  );
}
