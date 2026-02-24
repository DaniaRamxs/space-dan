import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * Onboarding Component
 * Logic to handle the initial identity setup and username claim.
 */
export default function OnboardingPage() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAvailable, setIsAvailable] = useState(null);
    const navigate = useNavigate();

    // Real-time availability check (Debounced in a real app)
    useEffect(() => {
        if (username.length < 3) {
            setIsAvailable(null);
            return;
        }

        const checkAvailability = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username_normalized', username.toLowerCase())
                .single();

            // If no data is found, it's available
            setIsAvailable(!data);
        };

        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }, [username]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // We call the RPC function to ensure 30-day cooldown and atomicity
            const { data, error: rpcError } = await supabase.rpc('claim_username', {
                p_username: username
            });

            if (rpcError) throw rpcError;

            if (data.success) {
                navigate('/home');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-container">
            <h1>🚀 Elige tu identidad espacial</h1>
            <p>Este será tu nombre único @username en el universo.</p>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <span className="prefix">@</span>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="tu_nombre_unico"
                        maxLength={20}
                        required
                    />
                    {isAvailable === true && <span className="status-ok">✔ Disponible</span>}
                    {isAvailable === false && <span className="status-err">✖ Ya está en uso</span>}
                </div>

                {error && <div className="error-box">{error}</div>}

                <button
                    type="submit"
                    disabled={loading || !isAvailable || username.length < 3}
                    className="btn-primary"
                >
                    {loading ? 'Reclamando...' : 'Empezar mi viaje'}
                </button>
            </form>

            <style jsx>{`
        .onboarding-container { max-width: 400px; margin: 100px auto; text-align: center; }
        .input-group { display: flex; align-items: center; border-bottom: 2px solid #333; margin: 20px 0; }
        .prefix { font-size: 1.5rem; color: #666; }
        input { border: none; font-size: 1.5rem; padding: 10px; width: 100%; outline: none; background: transparent; color: white; }
        .error-box { color: #ff4444; background: rgba(255, 68, 68, 0.1); padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status-ok { color: #00ff88; font-size: 0.8rem; }
        .status-err { color: #ff4444; font-size: 0.8rem; }
        .btn-primary { width: 100%; padding: 15px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
        </div>
    );
}
