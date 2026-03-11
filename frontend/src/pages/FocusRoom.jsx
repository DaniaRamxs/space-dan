import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { roomsService } from '../services/rooms';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function FocusRoom() {
    const { roomId } = useParams();
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timerActive, setTimerActive] = useState(false);
    const [minutesLeft, setMinutesLeft] = useState(25);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const timerRef = useRef(null);

    useEffect(() => {
        if (!roomId) return;
        loadRoom();

        const channel = roomsService.subscribeToRoom(roomId, (updatedRoom) => {
            setRoom(updatedRoom);
            // Sync local timer if it's significantly different
            if (updatedRoom.timer_status === 'active' && !timerActive) {
                startLocalTimer(updatedRoom.timer_minutes_left);
            } else if (updatedRoom.timer_status === 'idle') {
                stopLocalTimer();
            }
        });

        return () => {
            stopLocalTimer();
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    async function loadRoom() {
        try {
            const data = await roomsService.getRoomStatus(roomId);
            setRoom(data);
            setMinutesLeft(data.timer_minutes_left || 25);
            if (data.timer_status === 'active') setTimerActive(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function startLocalTimer(mins) {
        setTimerActive(true);
        setMinutesLeft(mins);
        setSecondsLeft(0);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev === 0) {
                    setMinutesLeft(m => {
                        if (m === 0) {
                            stopLocalTimer();
                            return 0;
                        }
                        return m - 1;
                    });
                    return 59;
                }
                return prev - 1;
            });
        }, 1000);
    }

    function stopLocalTimer() {
        setTimerActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
    }

    const handleToggleTimer = async () => {
        const newStatus = timerActive ? 'idle' : 'active';
        const newMins = 25; // Reset to 25 for now

        setTimerActive(!timerActive);
        if (!timerActive) startLocalTimer(newMins);
        else stopLocalTimer();

        try {
            await roomsService.updateRoomTimer(roomId, newStatus, newMins);
        } catch (err) {
            alert('Error al sincronizar el temporizador');
        }
    };

    if (loading) return <div className="p-8 text-center opacity-50">Sincronizando ambiente...</div>;

    const progress = 1 - ((minutesLeft * 60 + secondsLeft) / (25 * 60));

    return (
        <div className="layoutOne" style={{ maxWidth: '800px', textAlign: 'center' }}>
            <div className="glassCard" style={{ padding: '40px', position: 'relative', overflow: 'hidden' }}>
                {/* Background pulse when active */}
                <AnimatePresence>
                    {timerActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute', inset: 0,
                                background: 'var(--accent)',
                                filter: 'blur(50px)'
                            }}
                        />
                    )}
                </AnimatePresence>

                <h1 style={{ margin: '0 0 10px 0' }}>Sala de Enfoque</h1>
                <p style={{ opacity: 0.5, fontSize: '14px', marginBottom: '40px' }}>Concentración sincronizada en tiempo real</p>

                <div style={{ position: 'relative', width: '250px', height: '250px', margin: '0 auto 40px' }}>
                    {/* Circle Progress */}
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                        <motion.circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="4"
                            strokeDasharray="283"
                            animate={{ strokeDashoffset: 283 * (1 - progress) }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        />
                    </svg>

                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center'
                    }}>
                        <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                            {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.5, letterSpacing: '2px' }}>
                            {timerActive ? 'EN TRANCE' : 'ESPERANDO'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleToggleTimer}
                        className={timerActive ? 'btn-glass' : 'btn-accent'}
                        style={{ padding: '12px 40px', borderRadius: '30px' }}
                    >
                        {timerActive ? 'Pausar Sesión' : 'Iniciar Enfoque'}
                    </motion.button>
                </div>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px' }}>👥</div>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>2 en sintonía</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px' }}>⚡</div>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>Bonus x1.5</div>
                </div>
            </div>
        </div>
    );
}
