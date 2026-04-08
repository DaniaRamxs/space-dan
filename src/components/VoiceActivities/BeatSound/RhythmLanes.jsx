import { useMemo } from 'react';
import { motion } from 'framer-motion';

const LANE_KEYS = {
    easy: ['D', 'K'],
    normal: ['D', 'F', 'K'],
    pro: ['D', 'F', 'J', 'K']
};

const LANE_COLORS = [
    '#ef4444', // Rojo
    '#3b82f6', // Azul
    '#eab308', // Amarillo
    '#a855f7', // Púrpura
];

const HIT_LINE_POSITION = 85; // % desde arriba donde deben presionar

export default function RhythmLanes({ 
    beats, 
    currentTime, 
    difficulty = 'normal',
    isPlaying,
    onLanePress 
}) {
    const laneKeys = LANE_KEYS[difficulty] || LANE_KEYS.normal;
    const laneCount = laneKeys.length;
    
    // Filtrar beats activos y calcular su posición
    const activeNotes = useMemo(() => {
        if (!beats || !isPlaying) return [];
        
        const FALL_DURATION = 2000; // 2 segundos para caer
        const notes = [];
        
        for (const beat of beats) {
            if (!beat.isActive) continue;
            
            const timeToBeat = beat.time - currentTime;
            
            // Mostrar notas que están cayendo o a punto de caer
            if (timeToBeat > -200 && timeToBeat < FALL_DURATION) {
                // Calcular posición Y (0% = arriba, 100% = abajo)
                // En timeToBeat=FALL_DURATION, y=0%
                // En timeToBeat=0, y=HIT_LINE_POSITION%
                const progress = 1 - (timeToBeat / FALL_DURATION);
                const y = progress * HIT_LINE_POSITION;
                
                notes.push({
                    id: beat.time,
                    lane: beat.lane,
                    y: y,
                    type: beat.type,
                    timeToBeat: timeToBeat
                });
            }
        }
        
        return notes;
    }, [beats, currentTime, isPlaying]);
    
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full max-w-2xl h-full flex">
                {/* Carriles */}
                {laneKeys.map((key, index) => (
                    <div 
                        key={index}
                        className="flex-1 relative border-x border-white/10"
                        style={{ 
                            backgroundColor: `${LANE_COLORS[index]}10`
                        }}
                    >
                        {/* Línea de hit */}
                        {index === 0 && (
                            <div 
                                className="absolute left-0 right-0 h-1 bg-white/30 z-10"
                                style={{ top: `${HIT_LINE_POSITION}%` }}
                            />
                        )}
                        
                        {/* Zona de hit visual */}
                        <div 
                            className="absolute left-0 right-0 h-16 bg-white/5 border-y border-white/20 z-0"
                            style={{ top: `${HIT_LINE_POSITION - 8}%` }}
                        />
                        
                        {/* Tecla en la parte inferior */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                            <div 
                                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold border-2 shadow-lg"
                                style={{
                                    backgroundColor: LANE_COLORS[index],
                                    borderColor: `${LANE_COLORS[index]}`,
                                    color: 'white'
                                }}
                            >
                                {key}
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Notas cayendo */}
                {activeNotes.map((note) => {
                    const laneWidth = 100 / laneCount;
                    const x = (note.lane * laneWidth) + (laneWidth / 2);
                    
                    return (
                        <motion.div
                            key={note.id}
                            className="absolute z-10"
                            style={{
                                left: `${x}%`,
                                top: `${note.y}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                        >
                            <div 
                                className="w-14 h-14 rounded-lg shadow-2xl border-2 flex items-center justify-center"
                                style={{
                                    backgroundColor: LANE_COLORS[note.lane],
                                    borderColor: 'white',
                                    boxShadow: `0 0 20px ${LANE_COLORS[note.lane]}80`,
                                }}
                            >
                                {note.type === 'special' && (
                                    <div className="text-2xl">⭐</div>
                                )}
                                {note.type === 'double' && (
                                    <div className="text-2xl">💎</div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
