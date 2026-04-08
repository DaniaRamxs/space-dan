/* ===========================
   RadioSvg.jsx
   =========================== */

import React from "react";

/* ---- Iconos ---- */
const ICONS = {
    nightwave: (
        <>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            <path d="M19 3v4" />
            <path d="M21 5h-4" />
        </>
    ),
    lofi: (
        <>
            <path d="M17.5 19a3.5 3.5 0 1 1-3.5-3.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5Z" />
            <path d="M4.5 19a3.5 3.5 0 1 1 3.5-3.5c0-1.4-1.1-2.5-2.5-2.5S3 14.1 3 15.5c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5Z" />
            <path d="M12 19V5a2 2 0 0 1-2-2" />
        </>
    ),
    space: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
        </>
    ),
};

const RadioSvg = ({
    type,
    size = 24,
    color = "#22d3ee",
    animated = false,
    glow = false,
    className = "",
}) => {
    const icon = ICONS[type];
    if (!icon) return null;

    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            stroke={color}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`
        ${animated ? "animate-float" : ""}
        ${glow ? "icon-glow" : ""}
        ${className}
      `}
        >
            {icon}
        </svg>
    );
};

export default RadioSvg;
