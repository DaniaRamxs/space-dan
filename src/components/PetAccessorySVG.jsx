/**
 * PetAccessorySVG — SVGs animados para cada accesorio de mascota.
 * Reemplaza los emojis aburridos con ilustraciones vivas.
 * 
 * Cada accesorio tiene su propio SVG animado inline con CSS animations.
 */

const svgStyle = {
    width: '100%',
    height: '100%',
    overflow: 'visible',
};

// ── HEAD SLOT ──

function HatCap({ color = '#00e5ff' }) {
    return (
        <svg viewBox="0 0 60 40" style={svgStyle}>
            <defs>
                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor="#0088aa" />
                </linearGradient>
            </defs>
            {/* Visor */}
            <ellipse cx="30" cy="32" rx="28" ry="6" fill="#111" opacity="0.7" />
            {/* Cap body */}
            <path d="M8 30 Q8 10 30 8 Q52 10 52 30 Z" fill="url(#capGrad)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.2" />
            {/* Logo dot */}
            <circle cx="30" cy="20" r="3" fill="#fff" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

function HatWizard({ color = '#bf5fff' }) {
    return (
        <svg viewBox="0 0 60 55" style={svgStyle}>
            <defs>
                <linearGradient id="wizGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#190b3d" />
                    <stop offset="100%" stopColor={color} />
                </linearGradient>
            </defs>
            {/* Hat body */}
            <polygon points="30,2 48,48 12,48" fill="url(#wizGrad)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.15" />
            {/* Brim */}
            <ellipse cx="30" cy="48" rx="26" ry="5" fill={color} opacity="0.8" />
            {/* Stars */}
            <circle cx="25" cy="22" r="1.5" fill="#ffd700">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="35" cy="32" r="1" fill="#ffd700">
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="22" cy="36" r="1.2" fill="#ffd700">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
            </circle>
            {/* Tip glow */}
            <circle cx="30" cy="4" r="3" fill="#ffd700" opacity="0.6">
                <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

function HatCrown() {
    return (
        <svg viewBox="0 0 60 40" style={svgStyle}>
            <defs>
                <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
            </defs>
            {/* Crown body */}
            <path d="M8 35 L8 18 L18 25 L30 8 L42 25 L52 18 L52 35 Z" fill="url(#crownGrad)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3" />
            {/* Base */}
            <rect x="6" y="33" width="48" height="5" rx="2" fill="#b8860b" />
            {/* Gems */}
            <circle cx="18" cy="30" r="2.5" fill="#ff0050">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="30" cy="28" r="3" fill="#00e5ff">
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="42" cy="30" r="2.5" fill="#39ff14">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
            </circle>
            {/* Sparkle */}
            <g>
                <line x1="30" y1="3" x2="30" y2="11" stroke="#ffd700" strokeWidth="1" opacity="0.8">
                    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                </line>
                <line x1="26" y1="7" x2="34" y2="7" stroke="#ffd700" strokeWidth="1" opacity="0.8">
                    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                </line>
            </g>
        </svg>
    );
}

// ── BODY SLOT ──

function Scarf({ color = '#ff6eb4' }) {
    return (
        <svg viewBox="0 0 60 35" style={svgStyle}>
            <path d="M5 5 Q30 0 55 5 Q55 15 50 18 Q45 20 42 22 L40 32 Q38 35 36 32 L34 22 Q30 20 5 15 Z"
                fill={color} opacity="0.85" stroke="#fff" strokeWidth="0.3" strokeOpacity="0.2" />
            {/* Stripes */}
            <line x1="12" y1="6" x2="10" y2="14" stroke="#fff" strokeWidth="1.5" opacity="0.15" />
            <line x1="22" y1="4" x2="20" y2="13" stroke="#fff" strokeWidth="1.5" opacity="0.15" />
            <line x1="32" y1="4" x2="30" y2="14" stroke="#fff" strokeWidth="1.5" opacity="0.15" />
            {/* Dangling end sway */}
            <g>
                <animateTransform attributeName="transform" type="rotate" values="-3 37 22;3 37 22;-3 37 22" dur="3s" repeatCount="indefinite" />
                <rect x="35" y="22" width="6" height="12" rx="3" fill={color} opacity="0.7" />
                <line x1="36" y1="24" x2="36" y2="32" stroke="#fff" strokeWidth="1" opacity="0.1" />
            </g>
        </svg>
    );
}

function CapeHero({ color = '#ff0050' }) {
    return (
        <svg viewBox="0 0 60 50" style={svgStyle}>
            <defs>
                <linearGradient id="capeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor="#660020" />
                </linearGradient>
            </defs>
            {/* Cape flowing */}
            <path d="M15 5 Q30 2 45 5 Q48 25 44 45 Q30 50 16 45 Q12 25 15 5 Z" fill="url(#capeGrad)" opacity="0.8">
                <animate attributeName="d"
                    values="M15 5 Q30 2 45 5 Q48 25 44 45 Q30 50 16 45 Q12 25 15 5 Z;M15 5 Q30 2 45 5 Q50 28 46 45 Q30 52 14 45 Q10 28 15 5 Z;M15 5 Q30 2 45 5 Q48 25 44 45 Q30 50 16 45 Q12 25 15 5 Z"
                    dur="4s" repeatCount="indefinite" />
            </path>
            {/* Emblem */}
            <polygon points="30,15 33,23 27,23" fill="#ffd700" opacity="0.9">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
            </polygon>
            {/* Collar */}
            <ellipse cx="30" cy="7" rx="14" ry="3" fill={color} opacity="0.9" />
        </svg>
    );
}

// ── HAND SLOT ──

function Wand() {
    return (
        <svg viewBox="0 0 40 50" style={svgStyle}>
            {/* Stick */}
            <line x1="20" y1="12" x2="20" y2="48" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
            <line x1="20" y1="12" x2="20" y2="48" stroke="#D2691E" strokeWidth="1.5" strokeLinecap="round" />
            {/* Star tip */}
            <polygon points="20,2 22,8 28,9 23,13 25,19 20,15 15,19 17,13 12,9 18,8"
                fill="#ffd700" stroke="#fff" strokeWidth="0.3" strokeOpacity="0.5">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="rotate" values="0 20 10;360 20 10" dur="6s" repeatCount="indefinite" />
            </polygon>
            {/* Sparkles */}
            <circle cx="14" cy="6" r="1" fill="#00e5ff">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="cy" values="6;2;6" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="26" cy="8" r="0.8" fill="#ff6eb4">
                <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="cy" values="8;4;8" dur="2s" begin="0.5s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

function Laptop() {
    return (
        <svg viewBox="0 0 50 40" style={svgStyle}>
            {/* Screen */}
            <rect x="8" y="4" width="34" height="22" rx="2" fill="#111" stroke="#444" strokeWidth="1" />
            {/* Screen content glow */}
            <rect x="10" y="6" width="30" height="18" rx="1" fill="#0a1628" />
            {/* Code lines */}
            <rect x="12" y="9" width="12" height="1.5" rx="0.5" fill="#00e5ff" opacity="0.6">
                <animate attributeName="width" values="8;14;8" dur="3s" repeatCount="indefinite" />
            </rect>
            <rect x="12" y="13" width="18" height="1.5" rx="0.5" fill="#39ff14" opacity="0.4">
                <animate attributeName="width" values="18;10;18" dur="2.5s" repeatCount="indefinite" />
            </rect>
            <rect x="12" y="17" width="10" height="1.5" rx="0.5" fill="#ff6eb4" opacity="0.5">
                <animate attributeName="width" values="10;16;10" dur="2s" repeatCount="indefinite" />
            </rect>
            {/* Keyboard base */}
            <path d="M4 28 L8 26 L42 26 L46 28 L46 32 Q46 34 44 34 L6 34 Q4 34 4 32 Z" fill="#222" stroke="#444" strokeWidth="0.5" />
            {/* Keyboard dots */}
            <rect x="14" y="29" width="22" height="3" rx="1" fill="#333" />
        </svg>
    );
}

// ── EXTRA SLOT ──

function GlassesNerd() {
    return (
        <svg viewBox="0 0 50 25" style={svgStyle}>
            {/* Left lens */}
            <circle cx="15" cy="13" r="8" fill="none" stroke="#666" strokeWidth="2" />
            <circle cx="15" cy="13" r="7" fill="rgba(100,200,255,0.1)" />
            {/* Right lens */}
            <circle cx="35" cy="13" r="8" fill="none" stroke="#666" strokeWidth="2" />
            <circle cx="35" cy="13" r="7" fill="rgba(100,200,255,0.1)" />
            {/* Bridge */}
            <path d="M23 13 Q25 10 27 13" fill="none" stroke="#666" strokeWidth="1.5" />
            {/* Glint */}
            <circle cx="12" cy="10" r="1.5" fill="#fff" opacity="0.5">
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="32" cy="10" r="1.5" fill="#fff" opacity="0.5">
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" begin="1.5s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

// ── BG SLOT ──

function BgSpace() {
    return (
        <svg viewBox="0 0 100 100" style={svgStyle}>
            <defs>
                <radialGradient id="spaceBg" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#0d0221" />
                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#spaceBg)" opacity="0.5" />
            {/* Stars */}
            {[
                [15, 20, 1.2], [75, 15, 0.8], [85, 70, 1], [20, 80, 0.7],
                [50, 10, 0.9], [10, 50, 0.6], [90, 40, 1.1], [40, 90, 0.8],
                [65, 55, 0.5], [30, 35, 0.7],
            ].map(([cx, cy, r], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="#fff">
                    <animate attributeName="opacity" values={`${0.2 + Math.random() * 0.3};${0.7 + Math.random() * 0.3};${0.2 + Math.random() * 0.3}`} dur={`${1.5 + Math.random() * 2}s`} repeatCount="indefinite" />
                </circle>
            ))}
            {/* Nebula puff */}
            <circle cx="60" cy="35" r="15" fill="#4c1d95" opacity="0.15">
                <animate attributeName="r" values="12;18;12" dur="6s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

function BgForest() {
    return (
        <svg viewBox="0 0 100 100" style={svgStyle}>
            <defs>
                <radialGradient id="forestBg" cx="50%" cy="80%" r="70%">
                    <stop offset="0%" stopColor="#0a3d0a" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                </radialGradient>
            </defs>
            <ellipse cx="50" cy="85" rx="50" ry="20" fill="url(#forestBg)" />
            {/* Fireflies */}
            {[
                [20, 40], [60, 30], [80, 55], [35, 65], [70, 75], [15, 70],
            ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="1.5" fill="#39ff14">
                    <animate attributeName="opacity" values="0;0.8;0" dur={`${2 + i * 0.5}s`} begin={`${i * 0.4}s`} repeatCount="indefinite" />
                    <animate attributeName="cy" values={`${cy};${cy - 5};${cy}`} dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                </circle>
            ))}
        </svg>
    );
}

// ── REGISTRY ──

const SVG_REGISTRY = {
    hat_cap: HatCap,
    hat_wizard: HatWizard,
    hat_crown: HatCrown,
    scarf: Scarf,
    cape_hero: CapeHero,
    wand: Wand,
    laptop: Laptop,
    glasses_nerd: GlassesNerd,
    bg_space: BgSpace,
    bg_forest: BgForest,
};

/**
 * Renders an animated SVG accessory by its svg_id from the store_items metadata.
 * Falls back to emoji if no SVG is found.
 */
export default function PetAccessorySVG({ svgId, icon, size = 50 }) {
    const Component = SVG_REGISTRY[svgId];

    if (Component) {
        return (
            <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Component />
            </div>
        );
    }

    // Fallback to emoji icon
    return (
        <span style={{ fontSize: size * 0.7, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
            {icon || '✨'}
        </span>
    );
}
