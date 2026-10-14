export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-lockup ${compact ? "compact" : ""}`}>
    <svg className="brand-mark" viewBox="0 0 48 48" role="img" aria-label="KL Autocare">
      <path d="M8 8v32M8 25 25 8M15 25l13 15M31 8v32M31 25 44 12M36 25l8 15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
    <span className="brand-wordmark">KL Autocare<small>CAR WASH &amp; DETAILING STUDIO</small></span>
  </span>;
}
