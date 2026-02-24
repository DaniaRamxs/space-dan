import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';


export default function OnboardingPage() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const { profile } = useAuthContext();
    const navigate = useNavigate();
    const isNewUser = !profile?.username;


    useEffect(() => {
        const val = username.trim().toLowerCase();
        if (val.length < 3) {
            setIsAvailable(null);
            return;
        }

        const checkAvailability = async () => {
            setChecking(true);
            const { data } = await supabase
                .from('profiles')
                .select('username')
                .eq('username_normalized', val)
                .maybeSingle();

            setIsAvailable(!data);
            setChecking(false);
        };

        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }, [username]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('claim_username', {
                p_username: username.trim()
            });

            if (rpcError) throw rpcError;

            if (data.success) {
                // Redirigir al perfil o home
                navigate('/home');
                // Forzar recarga de perfil si es necesario (el hook useAuth ya tiene suscripción)
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboardingPage">
            <motion.div
                className="card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ maxWidth: 450, margin: '0 auto', textAlign: 'center' }}
            >
                <div className="pageHeader" style={{ border: 'none' }}>
                    <h1 style={{ fontSize: 28 }}>
                        {isNewUser ? '🚀 identidad espacial' : '🛠️ actualizar identidad'}
                    </h1>
                    <p className="tinyText" style={{ fontSize: 13, marginTop: 10 }}>
                        {isNewUser
                            ? 'bienvenido al dan-space. elige tu nombre único de explorador para continuar tu viaje.'
                            : 'puedes cambiar tu nombre de explorador aquí. recuerda el cooldown de 30 días.'}
                    </p>

                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                    <div className="onboardingInputWrapper">
                        <span className="atSymbol">@</span>
                        <input
                            type="text"
                            className="onboardingInput"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="tu_nombre"
                            maxLength={20}
                            autoFocus
                            required
                        />
                    </div>

                    <div style={{ height: 24, fontSize: 12, marginTop: 5 }}>
                        {checking && <span style={{ color: 'var(--cyan)' }}>verificando disponibilidad...</span>}
                        {!checking && isAvailable === true && <span style={{ color: '#2dff79' }}>✨ nombre disponible</span>}
                        {!checking && isAvailable === false && <span style={{ color: '#ff4444' }}>❌ este nombre ya está ocupado</span>}
                        {!checking && username.length > 0 && username.length < 3 && (
                            <span style={{ opacity: 0.5 }}>mínimo 3 caracteres</span>
                        )}
                    </div>

                    {error && (
                        <div className="errorMessage" style={{ marginTop: 15 }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="onboardingBtn"
                        disabled={loading || !isAvailable || username.length < 3 || username.trim() === profile?.username}
                    >
                        {loading ? 'procesando...' : isNewUser ? 'reclamar identidad' : 'actualizar nombre'}
                    </button>

                    {!isNewUser && (
                        <Link to="/profile" className="cancelLink">
                            mantener nombre actual
                        </Link>
                    )}

                </form>

                <p className="tinyText" style={{ marginTop: 20, fontSize: 11, fontStyle: 'italic' }}>
                    * solo puedes cambiar tu nombre una vez cada 30 días.
                </p>
            </motion.div>

            <style jsx>{`
        .onboardingPage {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .onboardingInputWrapper {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 16px;
          transition: border-color 0.3s;
        }
        .onboardingInputWrapper:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 15px var(--accent-dim);
        }
        .atSymbol {
          font-size: 24px;
          color: var(--accent);
          font-weight: bold;
          margin-right: 5px;
        }
        .onboardingInput {
          background: transparent;
          border: none;
          color: white;
          font-size: 20px;
          font-family: var(--font-mono);
          width: 100%;
          outline: none;
        }
        .onboardingBtn {
          margin-top: 20px;
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid var(--accent);
          background: var(--accent-dim);
          color: white;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.3s;
        }
        .onboardingBtn:hover:not(:disabled) {
          background: var(--accent);
          box-shadow: 0 0 20px var(--accent-glow);
          transform: translateY(-2px);
        }
        .onboardingBtn:disabled {
          opacity: 0.4;
          border-color: var(--border);
          cursor: not-allowed;
        }
        .errorMessage {
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          color: #ff6b6b;
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
        }
        .cancelLink {
          display: block;
          margin-top: 15px;
          font-size: 11px;
          color: var(--text-muted);
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .cancelLink:hover {
          color: white;
        }

      `}</style>
        </div>
    );
}
