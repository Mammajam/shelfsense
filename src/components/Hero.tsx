const SAGE = "#6FA8A0";
const AMBER = "#F5B342";

function ShelfIllustration() {
  const bar = (x: number, y: number, h: number, fill = SAGE) => (
    <rect key={`${x}-${y}`} x={x} y={y} width="34" height={h} rx="5" fill={fill} />
  );
  return (
    <svg viewBox="-280 -280 560 560" className="h-auto w-full max-w-md" role="img" aria-label="A shelf with a location pin">
      <defs>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.35" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="270" fill="url(#glow)" />
      <g className="pulse-ring" fill="none" stroke={AMBER} strokeWidth="2" strokeDasharray="4 10">
        <circle r="250" strokeOpacity="0.18" />
        <circle r="190" strokeOpacity="0.3" />
      </g>
      <circle r="130" fill="none" stroke={AMBER} strokeOpacity="0.45" strokeWidth="2" />
      <rect x="-120" y="-120" width="240" height="240" rx="14" fill="#0A1E25" stroke="#F4EFE6" strokeOpacity="0.9" strokeWidth="5" />
      <path d="M-120 -40H120M-120 40H120" stroke="#F4EFE6" strokeWidth="5" />
      {[bar(-100, -98, 48), bar(-58, -88, 38), bar(-16, -104, 54), bar(26, -92, 42), bar(68, -100, 50)]}
      {[bar(-100, -18, 48), bar(-58, -10, 40), bar(26, -8, 38), bar(68, -18, 48)]}
      <rect x="-16" y="-16" width="34" height="46" rx="5" fill="none" stroke={AMBER} strokeWidth="4" strokeDasharray="7 6" />
      {[bar(-100, 62, 46), bar(-58, 54, 54, AMBER), bar(-16, 66, 42), bar(26, 58, 50, AMBER), bar(68, 64, 44)]}
      <g transform="translate(120 -128)">
        <path d="M0 40C-26 6 -34 -6 -34 -22A34 34 0 0 1 34 -22C34 -6 26 6 0 40Z" fill={AMBER} stroke="#0E2A33" strokeWidth="5" />
        <circle cy="-22" r="12" fill="#0E2A33" />
      </g>
    </svg>
  );
}

export function Hero() {
  return (
    <header className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pt-12 pb-8 md:grid-cols-2 md:pt-20 md:pb-12">
      <div className="rise">
        <h1 className="font-display text-6xl font-bold tracking-tight sm:text-7xl">
          Shelf<span className="text-amber">Sense</span>
        </h1>
        <p className="mt-5 text-2xl text-cream/90 sm:text-3xl">Stock what your neighborhood wants.</p>
        <p className="mt-3 max-w-md text-lg text-cream/65">
          Location-aware taste insight for independent shops: what to add, what to reduce, and who to partner with,
          with the evidence behind every call.
        </p>
        <span className="mt-7 inline-block rounded-full border-[2.5px] border-amber px-5 py-2 text-sm font-bold tracking-[0.15em] text-amber">
          POWERED BY QLOO
        </span>
      </div>
      <div className="rise flex justify-center md:justify-end" style={{ animationDelay: "0.15s" }}>
        <ShelfIllustration />
      </div>
    </header>
  );
}
