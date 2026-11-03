/* Shown straight away while an admin page is on its way. */
export default function Loading() {
  return (
    <main className="a-loading" aria-busy="true">
      <p className="sr-only" role="status">Loading</p>
      <div className="skeleton skeleton-title" aria-hidden="true" />
      <div className="skeleton skeleton-line" aria-hidden="true" />
      <div className="skeleton skeleton-line skeleton-short" aria-hidden="true" />
      <div className="skeleton skeleton-block" aria-hidden="true" />
    </main>
  );
}
