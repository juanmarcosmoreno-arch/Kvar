/** "Kvar" con la hoja sobre la K, como en el logo. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-end font-semibold tracking-tight text-forest dark:text-primary ${className}`}>
      <span className="relative">
        K
        <svg viewBox="0 0 40 40" className="absolute -right-[0.18em] -top-[0.12em] h-[0.55em] w-[0.55em]" aria-hidden>
          <path d="M4 36 C 8 18, 20 6, 38 2 C 36 22, 24 32, 4 36 Z" fill="#4CAF6B" />
        </svg>
      </span>
      <span>var</span>
    </span>
  );
}
