import DisplayOptions from "@/components/DisplayOptions";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <SiteNav />
      <DisplayOptions />
      {children}
      <SiteFooter />
    </div>
  );
}
