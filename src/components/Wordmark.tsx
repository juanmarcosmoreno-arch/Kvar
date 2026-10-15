import wordmark from '../assets/brand/stoka-wordmark.webp';
import wordmarkDark from '../assets/brand/stoka-wordmark-dark.webp';

/** «Stoka» con su trazo de pincel y los destellos sobre la o, como en el logo. */
export function Wordmark({ className = 'h-9' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`} role="img" aria-label="Stoka">
      <img src={wordmark} alt="" className="h-full w-auto dark:hidden" />
      <img src={wordmarkDark} alt="" className="hidden h-full w-auto dark:block" />
    </span>
  );
}
