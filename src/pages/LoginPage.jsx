import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';

// Nodos del ícono con sus posiciones (en el espacio del SVG con translate(30,20))
const NODES = [
  { cx: 190, cy: 40,  r: 14 }, // nodo principal (top right)
  { cx: 90,  cy: 70,  r: 10 }, // nodo medio
  { cx: 160, cy: 160, r: 11 }, // nodo bottom right
  { cx: 50,  cy: 110, r: 7  }, // nodo small left
];

// Líneas de conexión separadas para animarlas individualmente
const LINES = [
  { d: 'M190 40 L160 160' },
  { d: 'M190 40 L90 70' },
  { d: 'M160 160 L90 70' },
  { d: 'M90 70 L50 110' },
  { d: 'M160 160 L50 110' },
];

function SpacelyIconAnimated({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="55 30 175 165"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="iconGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4B76F7" />
          <stop offset="100%" stopColor="#3ED9ED" />
        </linearGradient>
        <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g transform="translate(30, 20)">

        {/* Líneas: se dibujan después de que aparecen los nodos */}
        {LINES.map((line, i) => (
          <motion.path
            key={i}
            d={line.d}
            stroke="url(#iconGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{
              pathLength: { duration: 0.5, delay: 1.2 + i * 0.15, ease: 'easeInOut' },
              opacity:    { duration: 0.1, delay: 1.2 + i * 0.15 },
            }}
          />
        ))}

        {/* Swoosh: aparece al final */}
        <motion.path
          d="M22 135 C 25 180, 100 170, 195 45 C 130 110, 50 160, 22 135 Z"
          fill="url(#iconGrad)"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: '108px 112px' }}
          transition={{ duration: 0.6, delay: 2.2, ease: 'backOut' }}
        />

        {/* Cola del swoosh */}
        <motion.path
          d="M22 135 C 15 110, 40 100, 65 105"
          stroke="url(#iconGrad)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.4, delay: 2.3, ease: 'easeOut' },
            opacity:    { duration: 0.1, delay: 2.3 },
          }}
        />

        {/* Nodos: aparecen uno por uno primero */}
        {NODES.map((node, i) => (
          <motion.circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="url(#iconGrad)"
            filter="url(#iconGlow)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
            transition={{
              opacity: { duration: 0.4, delay: i * 0.3 },
              scale:   { duration: 0.5, delay: i * 0.3, ease: 'backOut' },
            }}
          />
        ))}

      </g>
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading, loginWithGoogle, loginWithDiscord } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate('/posts', { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#060d1f]">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#060d1f] px-6" style={{ paddingBottom: '10vh' }}>

      {/* Estrellas de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/8 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[100px]" />
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() > 0.8 ? '2px' : '1px',
              height: Math.random() > 0.8 ? '2px' : '1px',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      {/* Ícono SVG con círculo decorativo */}
      <motion.div
        className="relative flex items-center justify-center mb-8 z-10 w-36 h-36 overflow-visible"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Círculos decorativos — aparecen al mismo tiempo que el contenedor */}
        <motion.div
          className="absolute w-36 h-36 rounded-full border border-cyan-500/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
        <motion.div
          className="absolute w-32 h-32 rounded-full border border-cyan-400/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        />
        <SpacelyIconAnimated size={56} />
      </motion.div>

      {/* Título y subtítulo */}
      <motion.div
        className="text-center mb-10 z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h1 className="text-4xl font-black tracking-[0.25em] text-white uppercase mb-2">
          Spacely
        </h1>
        <p className="text-cyan-400/60 text-xs tracking-[0.3em] uppercase mb-4">
          Tu universo, a tu manera
        </p>
        <p className="text-white/35 text-sm max-w-[260px] mx-auto leading-relaxed">
          Navega a través de las estrellas y conecta
        </p>
      </motion.div>

      {/* Botones de login */}
      <motion.div
        className="flex flex-col gap-3 w-full max-w-[300px] z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
      >
        {/* Google */}
        <button
          onClick={loginWithGoogle}
          className="flex items-center justify-between w-full py-4 px-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 active:scale-95 transition-all duration-150 text-white font-medium text-sm"
        >
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </div>
          <span className="text-white/30 text-base">›</span>
        </button>

        {/* Discord */}
        <button
          onClick={loginWithDiscord}
          className="flex items-center justify-between w-full py-4 px-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-[#5865F2]/10 hover:border-[#5865F2]/30 active:scale-95 transition-all duration-150 text-white font-medium text-sm"
        >
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
              <path fill="#5865F2" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Continuar con Discord
          </div>
          <span className="text-white/30 text-base">›</span>
        </button>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-8 text-white/15 text-xs tracking-wider z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        PRIVACIDAD · TÉRMINOS
      </motion.p>

    </div>
  );
}
