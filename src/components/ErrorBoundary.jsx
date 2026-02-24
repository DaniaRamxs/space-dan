import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Error capturado en el juego:', error, errorInfo);
    }

    handleReset = () => {
        // Si el usuario quiere reintentar, limpiamos el error para forzar un re-render
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'rgba(20, 10, 30, 0.8)',
                    color: '#fff',
                    borderRadius: '16px',
                    border: '1px solid var(--accent)',
                    margin: '20px auto',
                    maxWidth: '500px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👾💥</div>
                    <h2 style={{ color: 'var(--accent)', textShadow: '0 0 10px var(--accent-glow)' }}>Error en el Sistema del Juego</h2>
                    <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
                        Los datos guardados parecen ser incompatibles con la nueva versión, o el juego encontró un error inesperado.<br />
                        El resto de Dan-Space sigue funcionando con normalidad.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                            onClick={() => {
                                // Limpiamos los datos locales posiblemente corruptos relacionados con juegos
                                Object.keys(localStorage).forEach(key => {
                                    if (key.includes('space-dan') && key.includes('-data')) {
                                        localStorage.removeItem(key);
                                    }
                                });
                                this.handleReset();
                            }}
                            style={{ padding: '10px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Resetear Datos y Reintentar
                        </button>
                        <button
                            onClick={() => window.location.href = '/games'}
                            style={{ padding: '10px 20px', background: 'transparent', color: 'var(--cyan)', border: '1px solid var(--cyan)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Volver a Juegos
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
