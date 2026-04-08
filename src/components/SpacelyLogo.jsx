import React from 'react';
import { Link } from 'react-router-dom';

export const SpacelyLogo = ({ className = "scale-100 origin-left" }) => {
    return (
        <Link to="/posts" className={`group flex flex-col justify-center select-none ${className}`}>
            <div className="flex items-center gap-1.5 md:gap-3 transition-transform duration-500 group-hover:scale-105">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-white">
                    SPACELY
                </h1>
                <div className="relative w-3.5 h-3.5 md:w-5 md:h-5">
                    <div className="absolute inset-0 bg-cyan-400 rounded-full blur-[3px] opacity-80 group-hover:opacity-100 group-hover:animate-ping duration-1000" />
                    <div className="absolute inset-1 bg-white rounded-full" />
                </div>
            </div>
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-cyan-400 mt-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                Tu universo, a tu manera.
            </span>
        </Link>
    );
};
