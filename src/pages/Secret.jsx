import { useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function Secret() {
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('/music/shop.mp3');
    audioRef.current.loop = true;
    audioRef.current.play().catch(() => {});
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);

  // Posiciones calculadas una sola vez al montar, no en cada re-render
  const crabs = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      bottom: Math.random() * 30,
      left: Math.random() * 100,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
    })),
  []);

  return (
    <div className="secretPage" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundImage: 'url(/imagen/playa.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      zIndex: 9999,
      overflow: 'auto',
      padding: '20px'
    }}>
      <h1></h1>
      <p>encontraste el hogar de los cangrejos :3</p>
      
      <Link 
        to="/home" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#ff0080',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          fontWeight: 'bold',
          marginTop: '20px'
        }}
      >
        🏠 Volver a la página principal
      </Link>
      
      {/* Cangrejos */}
      <div className="cangrejos">
        {crabs.map((crab) => (
          <div
            key={crab.id}
            className="cangrejo"
            style={{
              position: 'absolute',
              bottom: `${crab.bottom}%`,
              left: `${crab.left}%`,
              fontSize: '40px',
              animation: `crabWalk ${crab.duration}s linear infinite`,
              animationDelay: `${crab.delay}s`
            }}
          >
            🦀
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes crabWalk {
          0% {
            transform: translateX(0) scaleX(1);
          }
          48% {
            transform: translateX(-100px) scaleX(1);
          }
          50% {
            transform: translateX(-100px) scaleX(-1);
          }
          98% {
            transform: translateX(0) scaleX(-1);
          }
          100% {
            transform: translateX(0) scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}