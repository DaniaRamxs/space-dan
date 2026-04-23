import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary
 *
 * En un APK de Capacitor NO hay devtools por defecto. Si algo explota durante
 * el render inicial (ej: un context que lanza, una lib que usa `process.env` crudo),
 * React desmonta todo → body `bg-black` → pantalla negra.
 *
 * Este boundary captura el error y lo muestra on-screen para que veas EXACTAMENTE
 * qué falló sin necesidad de abrir `chrome://inspect`.
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary] Error capturado:', error);
    console.error('[GlobalErrorBoundary] Stack de componentes:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0a0a1a',
            color: '#f87171',
            padding: 24,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            lineHeight: 1.5,
            overflow: 'auto',
            zIndex: 99999,
          }}
        >
          <h1 style={{ color: '#22d3ee', fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
            Spacely — Error al iniciar
          </h1>
          <p style={{ color: '#fff', marginBottom: 16 }}>
            {err?.message || 'Error desconocido'}
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              backgroundColor: '#050510',
              padding: 12,
              borderRadius: 8,
              color: '#a5b4fc',
              fontSize: 11,
            }}
          >
            {err?.stack || '(sin stack)'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              backgroundColor: '#22d3ee',
              color: '#0a0a1a',
              border: 'none',
              borderRadius: 8,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
