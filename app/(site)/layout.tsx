import DisplayOptions from "@/components/DisplayOptions";
import SiteFooter from "@/components/SiteFooter";
import SiteTitle from "@/components/SiteTitle";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <SiteTitle />
      <DisplayOptions />
      {children}
      <SiteFooter />
    </div>
  );
}
