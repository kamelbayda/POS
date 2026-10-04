import React, { useId } from 'react';

/** Brand colours of BeeCash. */
export const BRAND = { honey: '#FFC21A', honeyDark: '#B98600', ink: '#1E1B16' };

/** The BeeCash bee on its honey tile (same drawing as public/icon.svg). */
export function BeeCashMark({ className = 'w-10 h-10' }: { className?: string }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="BeeCash">
      <rect width="512" height="512" rx="112" fill={BRAND.honey} />
      <g stroke={BRAND.ink} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="206" cy="178" rx="62" ry="92" transform="rotate(-24 206 178)" fill="#fff" />
        <ellipse cx="300" cy="170" rx="56" ry="84" transform="rotate(22 300 170)" fill="#fff" />
        <path d="M118 238 C 100 196 92 168 70 150" fill="none" />
        <path d="M140 228 C 140 186 150 158 140 130" fill="none" />
      </g>
      <circle cx="70" cy="150" r="14" fill={BRAND.ink} />
      <circle cx="140" cy="130" r="14" fill={BRAND.ink} />
      <path d="M398 318 L 462 334 L 398 352 Z" fill={BRAND.ink} />
      <defs>
        <clipPath id={clip}><ellipse cx="262" cy="320" rx="150" ry="112" /></clipPath>
      </defs>
      <ellipse cx="262" cy="320" rx="150" ry="112" fill={BRAND.ink} />
      <g clipPath={`url(#${clip})`} fill={BRAND.honey}>
        <rect x="214" y="200" width="34" height="240" />
        <rect x="292" y="200" width="34" height="240" />
        <rect x="364" y="200" width="26" height="240" />
      </g>
      <circle cx="136" cy="300" r="70" fill={BRAND.ink} />
      <circle cx="114" cy="286" r="16" fill="#fff" />
      <circle cx="110" cy="284" r="7" fill={BRAND.ink} />
      <path d="M96 332 Q 114 346 134 336" stroke={BRAND.honey} strokeWidth="9" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** "BeeCash" wordmark; `onDark` for dark backgrounds. */
export function BeeCashWordmark({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
  return (
    <span dir="ltr" className={`font-black tracking-tight ${className}`}>
      <span style={{ color: onDark ? BRAND.honey : BRAND.ink }}>Bee</span>
      <span style={{ color: onDark ? '#fff' : BRAND.honeyDark }}>Cash</span>
    </span>
  );
}
