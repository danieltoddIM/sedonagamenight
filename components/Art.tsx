// Original illustrations: red rock mesas, a desert sun, and game pieces.

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#b4532a" />
      <circle cx="10" cy="10" r="2.6" fill="#fbf6ee" />
      <circle cx="22" cy="22" r="2.6" fill="#fbf6ee" />
      <circle cx="16" cy="16" r="2.6" fill="#fbf6ee" />
      <circle cx="22" cy="10" r="2.6" fill="#fbf6ee" />
      <circle cx="10" cy="22" r="2.6" fill="#fbf6ee" />
    </svg>
  );
}

export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 480 400" role="img" aria-label="Red rock mesas at sunset with dice and game pieces on a table">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6c98f" />
          <stop offset="1" stopColor="#fbe7cf" />
        </linearGradient>
        <linearGradient id="rockA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8643a" />
          <stop offset="1" stopColor="#9a4223" />
        </linearGradient>
        <linearGradient id="rockB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b4532a" />
          <stop offset="1" stopColor="#7d3219" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="300" rx="28" fill="url(#sky)" />
      <circle cx="350" cy="120" r="54" fill="#e9a23b" opacity="0.9" />
      {/* far mesas */}
      <path d="M0 210 L40 210 L52 160 L120 160 L132 120 L170 120 L182 165 L230 165 L240 210 L480 210 L480 300 L0 300 Z" fill="url(#rockA)" opacity="0.75" />
      {/* near butte with spires */}
      <path d="M0 300 L0 240 L60 240 L72 190 L96 190 L104 150 L118 150 L126 190 L160 190 L176 230 L290 230 L300 180 L318 180 L322 140 L336 140 L342 180 L370 180 L384 236 L480 236 L480 300 Z" fill="url(#rockB)" />
      <path d="M0 262 Q120 252 240 262 T480 258 L480 300 L0 300 Z" fill="#6b2a14" opacity="0.35" />
      {/* table */}
      <rect x="20" y="290" width="440" height="96" rx="20" fill="#1f5c5b" />
      <rect x="20" y="290" width="440" height="14" rx="7" fill="#2a7472" />
      {/* game board */}
      <g transform="translate(150 312) rotate(-4)">
        <rect width="150" height="56" rx="6" fill="#fbf6ee" />
        <rect x="6" y="6" width="22" height="22" fill="#e9a23b" />
        <rect x="28" y="6" width="22" height="22" fill="#f3e6d3" />
        <rect x="50" y="6" width="22" height="22" fill="#b4532a" />
        <rect x="72" y="6" width="22" height="22" fill="#f3e6d3" />
        <rect x="94" y="6" width="22" height="22" fill="#1f5c5b" />
        <rect x="116" y="6" width="28" height="22" fill="#f3e6d3" />
        <rect x="6" y="28" width="22" height="22" fill="#f3e6d3" />
        <rect x="28" y="28" width="22" height="22" fill="#1f5c5b" />
        <rect x="50" y="28" width="22" height="22" fill="#f3e6d3" />
        <rect x="72" y="28" width="22" height="22" fill="#e9a23b" />
        <rect x="94" y="28" width="22" height="22" fill="#f3e6d3" />
        <rect x="116" y="28" width="28" height="22" fill="#b4532a" />
      </g>
      {/* dice */}
      <g transform="translate(60 318) rotate(-12)">
        <rect width="44" height="44" rx="9" fill="#fff" stroke="#e2d2bd" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="#2a211c" />
        <circle cx="22" cy="22" r="4" fill="#2a211c" />
        <circle cx="32" cy="32" r="4" fill="#2a211c" />
      </g>
      <g transform="translate(104 336) rotate(14)">
        <rect width="38" height="38" rx="8" fill="#b4532a" />
        <circle cx="11" cy="11" r="3.5" fill="#fff" />
        <circle cx="27" cy="11" r="3.5" fill="#fff" />
        <circle cx="11" cy="27" r="3.5" fill="#fff" />
        <circle cx="27" cy="27" r="3.5" fill="#fff" />
      </g>
      {/* pawns */}
      <g fill="#e9a23b">
        <circle cx="342" cy="314" r="9" />
        <path d="M333 344 Q342 318 351 344 Z" />
        <rect x="330" y="342" width="24" height="7" rx="3" />
      </g>
      <g fill="#fbf6ee">
        <circle cx="378" cy="322" r="9" />
        <path d="M369 352 Q378 326 387 352 Z" />
        <rect x="366" y="350" width="24" height="7" rx="3" />
      </g>
      {/* cards */}
      <g transform="translate(404 304) rotate(10)">
        <rect width="34" height="48" rx="5" fill="#fff" stroke="#e2d2bd" strokeWidth="2" />
        <path d="M17 14 L24 24 L17 34 L10 24 Z" fill="#b4532a" />
      </g>
    </svg>
  );
}

export function IconDice() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}
export function IconPeople() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c2.6 0 4.5 1.8 4.5 4.5" />
    </svg>
  );
}
export function IconCoffee() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 3v3M12 3v3" />
    </svg>
  );
}
export function IconHeart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}
