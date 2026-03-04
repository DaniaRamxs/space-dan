import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Eraser, Pen, Clock, Users } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';

const COLORS = ['#fff', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
const WORDS = ['Astronauta', 'Agujero Negro', 'Satélite', 'Extraterrestre', 'Supernova', 'Cohete', 'Meteorito', 'Estación Espacial'];

export default function CosmicDraw({ roomName, onClose }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState(COLORS[0]);
    const [lineWidth, setLineWidth] = useState(3);
    const [timeLeft, setTimeLeft] = useState(60);
    const { localParticipant } = useLocalParticipant();
    const isHost = true; // Por ahora el que lo abre dibuja. Luego expandimos.
    const currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        const context = canvasRef.current.getContext('2d');
        context.beginPath();
        context.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const context = canvasRef.current.getContext('2d');
        context.lineTo(offsetX, offsetY);
        context.stroke();
    };

    const stopDrawing = () => {
        const context = canvasRef.current.getContext('2d');
        context.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            context.strokeStyle = color;
            context.lineWidth = lineWidth;
            context.lineCap = 'round';
            context.lineJoin = 'round';
        }
    }, [color, lineWidth]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-cyan-950/20 border border-cyan-500/20 rounded-3xl p-4 sm:p-6 mt-4 relative"
        >
            <button onClick={onClose} className="absolute right-4 top-4 text-cyan-500/50 hover:text-cyan-400 bg-cyan-500/10 p-2 rounded-full transition-all">
                <X size={16} />
            </button>
            <div className="flex justify-between items-center mb-4 pr-10">
                <div className="flex items-center gap-3 bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/20">
                    <span className="text-cyan-400 font-black tracking-widest uppercase text-[10px]">{isHost ? `Dibuja: ${currentWord}` : 'Adivinando...'}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs ${timeLeft < 10 ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse' : 'text-cyan-400 bg-white/5 border-white/10'}`}>
                    <Clock size={12} /> {timeLeft}s
                </div>
            </div>

            <div className="relative w-full aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/10 bg-[#020205] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] cursor-crosshair mb-4 touch-none">
                <canvas
                    ref={canvasRef}
                    width={800} // Resolución interna alta
                    height={600}
                    className="w-full h-full object-contain"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={e => {
                        const touch = e.touches[0];
                        const rect = canvasRef.current.getBoundingClientRect();
                        const scaleX = canvasRef.current.width / rect.width;
                        const scaleY = canvasRef.current.height / rect.height;
                        startDrawing({ nativeEvent: { offsetX: (touch.clientX - rect.left) * scaleX, offsetY: (touch.clientY - rect.top) * scaleY } });
                    }}
                    onTouchMove={e => {
                        e.preventDefault(); // Evita scroll
                        const touch = e.touches[0];
                        const rect = canvasRef.current.getBoundingClientRect();
                        const scaleX = canvasRef.current.width / rect.width;
                        const scaleY = canvasRef.current.height / rect.height;
                        draw({ nativeEvent: { offsetX: (touch.clientX - rect.left) * scaleX, offsetY: (touch.clientY - rect.top) * scaleY } });
                    }}
                    onTouchEnd={stopDrawing}
                />
            </div>

            <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-2">
                <div className="flex gap-2">
                    {COLORS.map(c => (
                        <button
                            key={c} onClick={() => setColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        />
                    ))}
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={() => setLineWidth(prev => prev === 3 ? 10 : 3)} className={`p-2 rounded-xl transition-all ${lineWidth > 3 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'}`}>
                        <Pen size={18} />
                    </button>
                    <button onClick={clearCanvas} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all">
                        <Eraser size={18} />
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                <input type="text" placeholder="¿Qué es esto?" disabled={isHost} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white disabled:opacity-50" />
                <button disabled={isHost} className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] disabled:opacity-50">Adivinar</button>
            </div>
        </motion.div>
    );
}
