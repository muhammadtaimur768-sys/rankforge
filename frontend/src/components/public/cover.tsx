import { createElement } from "react";
import { coverPalette, hash } from "@/lib/site-brand";
import { cn } from "@/lib/utils";
import { nicheIcon } from "./niche-icon";

/**
 * Deterministic cover art: gradient + subtle pattern + niche icon, seeded by slug.
 * Pure SVG, no external images, identical on server and client.
 */
export function Cover({
  seed,
  hue,
  keyword,
  title,
  niche,
  className,
  size = "card",
}: {
  seed: string;
  hue: number;
  keyword?: string | null;
  title?: string | null;
  niche?: string | null;
  className?: string;
  size?: "card" | "hero" | "thumb";
}) {
  const p = coverPalette(seed, hue);
  const Icon = nicheIcon(keyword, title, niche);
  const id = `c${hash(seed).toString(36)}${size}`;
  const W = 800;
  const H = 450;
  const iconSize = size === "thumb" ? 150 : 170;
  const cx = W * p.iconX;
  const cy = H * p.iconY;

  // A few soft contour rings, positioned by the seed.
  const rings = Array.from({ length: 7 }, (_, i) => 60 + i * 46 + p.rand() * 12);
  const rx = W * (0.15 + p.rand() * 0.3);
  const ry = H * (0.55 + p.rand() * 0.4);

  return (
    <div className={cn("relative overflow-hidden bg-raised", className)} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${id}-g`} gradientTransform={`rotate(${p.angle} 0.5 0.5)`}>
            <stop offset="0%" stopColor={p.from} />
            <stop offset="100%" stopColor={p.to} />
          </linearGradient>
          <radialGradient id={`${id}-r`} cx={p.iconX} cy={p.iconY} r="0.6">
            <stop offset="0%" stopColor={p.glow} stopOpacity="0.35" />
            <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
          </radialGradient>
          <pattern id={`${id}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="#fff" fillOpacity="0.16" />
          </pattern>
          <pattern id={`${id}-lines`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform={`rotate(${p.rotate + 35})`}>
            <line x1="0" y1="0" x2="0" y2="18" stroke="#fff" strokeOpacity="0.1" strokeWidth="2" />
          </pattern>
          <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-g)`} />
        {p.pattern === 0 ? <rect width={W} height={H} fill={`url(#${id}-dots)`} /> : null}
        {p.pattern === 1 ? <rect width={W} height={H} fill={`url(#${id}-lines)`} /> : null}
        {p.pattern === 3 ? <rect width={W} height={H} fill={`url(#${id}-grid)`} /> : null}
        {p.pattern === 2 || p.pattern === 3 ? (
          <g fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.5">
            {rings.map((r, i) => (
              <ellipse key={i} cx={rx} cy={ry} rx={r * 1.35} ry={r} transform={`rotate(${p.rotate} ${rx} ${ry})`} />
            ))}
          </g>
        ) : null}
        <rect width={W} height={H} fill={`url(#${id}-r)`} />
        <circle cx={cx} cy={cy} r={iconSize * 0.95} fill="#fff" fillOpacity="0.1" />
        <circle cx={cx} cy={cy} r={iconSize * 0.95} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" />
        {createElement(Icon, {
          x: cx - iconSize / 2,
          y: cy - iconSize / 2,
          width: iconSize,
          height: iconSize,
          color: "#ffffff",
          strokeWidth: 1.25,
          opacity: 0.92,
        })}
      </svg>
    </div>
  );
}
