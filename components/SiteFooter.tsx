import FollowButton from "./FollowButton";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>online web app made by tappioca. all intellectual properties belong to their rightful owners.</p>
      <FollowButton path="/feed.xml" label="rss feed for all stories" variant="link" />
    </footer>
  );
}
