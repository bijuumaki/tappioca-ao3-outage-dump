/* Shown straight away while a reader page is on its way, in place of the old page. */
export default function Loading() {
  return (
    <main className="page" id="main" aria-busy="true">
      <p className="sr-only" role="status">Loading</p>
      <div className="skeleton skeleton-title" aria-hidden="true" />
      <div className="skeleton skeleton-line" aria-hidden="true" />
      <div className="skeleton skeleton-line" aria-hidden="true" />
      <div className="skeleton skeleton-line skeleton-short" aria-hidden="true" />
      <div className="skeleton skeleton-block" aria-hidden="true" />
    </main>
  );
}
