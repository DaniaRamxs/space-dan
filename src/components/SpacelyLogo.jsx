import React from 'react';
import { Link } from 'react-router-dom';

const NODES = [
  { cx: 190, cy: 40,  r: 14 },
  { cx: 90,  cy: 70,  r: 10 },
  { cx: 160, cy: 160, r: 11 },
  { cx: 50,  cy: 110, r: 7  },
];

const LINES = [
  { d: 'M190 40 L160 160' },
  { d: 'M190 40 L90 70' },
  { d: 'M160 160 L90 70' },
  { d: 'M90 70 L50 110' },
  { d: 'M160 160 L50 110' },
];

export const SpacelyLogo = ({ className = "scale-100 origin-left" }) => {
    return (
        <Link to="/posts" className={`group flex flex-col justify-center items-center md:items-start select-none ${className}`}>
            <div className="flex items-center transition-transform duration-500 group-hover:scale-105">
                <svg
                    viewBox="55 30 175 165"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ overflow: 'visible' }}
                    className="w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_8px_rgba(62,217,237,0.4)]"
                >
                    <defs>
                        <linearGradient id="iconGradStatic" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4B76F7" />
                            <stop offset="100%" stopColor="#3ED9ED" />
                        </linearGradient>
                        <filter id="iconGlowStatic" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <g transform="translate(30, 20)">
                        {LINES.map((line, i) => (
                            <path key={i} d={line.d} stroke="url(#iconGradStatic)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
                        ))}
                        <path d="M22 135 C 25 180, 100 170, 195 45 C 130 110, 50 160, 22 135 Z" fill="url(#iconGradStatic)" />
                        <path d="M22 135 C 15 110, 40 100, 65 105" stroke="url(#iconGradStatic)" strokeWidth="4" fill="none" strokeLinecap="round" />
                        {NODES.map((node, i) => (
                            <circle key={i} cx={node.cx} cy={node.cy} r={node.r} fill="url(#iconGradStatic)" filter="url(#iconGlowStatic)" />
                        ))}
                    </g>
                </svg>
            </div>
        </Link>
    );
};
