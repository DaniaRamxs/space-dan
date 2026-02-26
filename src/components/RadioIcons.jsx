import React from 'react';

const RadioSvg = ({ type, className = "w-full h-full p-0.5" }) => {
    if (type === 'nightwave') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /><path d="M19 3v4" /><path d="M21 5h-4" />
        </svg>
    );
    if (type === 'lofi') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M17.5 19a3.5 3.5 0 1 1-3.5-3.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5Z" /><path d="M4.5 19a3.5 3.5 0 1 1 3.5-3.5c0-1.4-1.1-2.5-2.5-2.5S3 14.1 3 15.5c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5Z" /><path d="M12 19V5a2 2 0 0 1-2-2" />
        </svg>
    );
    if (type === 'jcore') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /><path d="M12 21a4.5 4.5 0 0 1 0-18" />
        </svg>
    );
    if (type === 'groove') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8h-2c0-2.9-1-5-2-7-2.31 4.31-5.69 7.69-10 10Z" /><path d="M7 20a5 5 0 0 1 0-10" />
        </svg>
    );
    if (type === 'beat') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 8v8" /><path d="M8 12v4" /><path d="M16 10v6" />
        </svg>
    );
    if (type === 'space') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
        </svg>
    );
    if (type === 'agent') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
    if (type === 'kpop') return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><circle cx="12" cy="10" r="2" fill="currentColor" stroke="none" />
        </svg>
    );
    return null;
};

export default RadioSvg;
