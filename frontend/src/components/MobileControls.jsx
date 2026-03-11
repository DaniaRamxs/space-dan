import { memo } from 'react';

// Controles móviles ergonómicos para la Arcade 
export const MobileControls = memo(({
    onLeft, onRight, onUp, onDown,
    onLeftUp, onRightUp, onUpUp, onDownUp,
    showLeft = false, showRight = false, showUp = false, showDown = false,
    actionA, actionAUp, actionALabel, actionAColor = '#00e5ff',
    actionB, actionBUp, actionBLabel, actionBColor = '#ff00ff',
}) => {
    return (
        <div
            className="md:hidden flex justify-between items-end fixed bottom-6 left-4 right-4 z-[9999]"
            style={{ touchAction: 'none' }}
        >
            {/* MOVEMENT / D-PAD (Lado Izquierdo) */}
            <div className="flex flex-col items-center gap-2">
                {showUp && (
                    <DpadBtn icon="▲" onDown={onUp} onUp={onUpUp} />
                )}
                <div className="flex gap-2">
                    {showLeft && <DpadBtn icon="◀" onDown={onLeft} onUp={onLeftUp} />}
                    {showDown && <DpadBtn icon="▼" onDown={onDown} onUp={onDownUp} />}
                    {showRight && <DpadBtn icon="▶" onDown={onRight} onUp={onRightUp} />}
                </div>
            </div>

            {/* ACTION BUTTONS (Lado Derecho) */}
            <div className="flex items-end gap-3 pb-1">
                {actionB && (
                    <ActionBtn
                        label={actionBLabel}
                        onDown={actionB}
                        onUp={actionBUp}
                        color={actionBColor}
                        size={56}
                    />
                )}
                {actionA && (
                    <ActionBtn
                        label={actionALabel}
                        onDown={actionA}
                        onUp={actionAUp}
                        color={actionAColor}
                        size={64}
                    />
                )}
            </div>
        </div>
    );
});

const DpadBtn = ({ icon, onDown, onUp }) => (
    <button
        onPointerDown={(e) => { e.preventDefault(); onDown && onDown(); }}
        onPointerUp={(e) => { e.preventDefault(); onUp && onUp(); }}
        onPointerLeave={(e) => { e.preventDefault(); onUp && onUp(); }}
        style={{
            width: 56, height: 56,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '1.4rem',
            fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: 'inset 0 0 10px rgba(255,255,255,0.02), 0 4px 10px rgba(0,0,0,0.3)',
            userSelect: 'none',
            WebkitUserSelect: 'none'
        }}
        className="active:scale-95 active:bg-white/20 transition-transform"
    >
        {icon}
    </button>
);

const ActionBtn = ({ label, onDown, onUp, color, size }) => (
    <button
        onPointerDown={(e) => { e.preventDefault(); onDown && onDown(); }}
        onPointerUp={(e) => { e.preventDefault(); onUp && onUp(); }}
        onPointerLeave={(e) => { e.preventDefault(); onUp && onUp(); }}
        style={{
            width: size, height: size,
            background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0))`,
            border: `2px solid ${color}44`,
            borderRadius: '50%',
            color,
            fontSize: size >= 64 ? '0.85rem' : '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: `inset 0 0 20px ${color}15, 0 8px 16px ${color}22`,
            userSelect: 'none',
            WebkitUserSelect: 'none'
        }}
        className="active:scale-95 active:brightness-125 transition-all"
    >
        {label}
    </button>
);
