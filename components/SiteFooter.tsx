import FollowButton from "./FollowButton";
import VisitorCount from "./VisitorCount";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>online web app made by tappioca. all intellectual properties belong to their rightful owners.</p>
      <div className="footer-row">
        <FollowButton path="/feed.xml" label="rss feed for all stories" variant="link" />
        <VisitorCount />
      </div>
    </footer>
  );
}
