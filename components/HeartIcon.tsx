/* The heart drawn once, used by the heart button and the count line on fic cards (works on the server and in the browser). */
export default function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" data-filled={filled} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.6 3 5 6.4 5c2 0 3.5 1.1 4.3 2.5L12 9.2l1.3-1.7C14.1 6.1 15.6 5 17.6 5 21 5 22.8 8.6 21.5 11.7 19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
