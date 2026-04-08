import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function NSFWWarning({ onConfirm, channelName }) {
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-[#1a1a24] border border-red-500/20 rounded-2xl p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Contenido Adulto</h2>
        <p className="text-gray-400 mb-2">#{channelName}</p>
        <p className="text-gray-500 text-sm mb-6">
          Este canal contiene contenido NSFW (+18). 
          Debes tener al menos 18 años para acceder.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => {
              setConfirmed(true);
              onConfirm?.();
            }}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-semibold transition-all"
          >
            Tengo 18 años o más - Entrar
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full py-3 text-gray-500 hover:text-gray-400 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

// Badge para mostrar en canales NSFW
export function NSFWBadge({ small }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-400 ${small ? 'text-[10px]' : 'text-xs'}`}>
      <AlertTriangle size={small ? 10 : 12} />
      NSFW
    </span>
  );
}
