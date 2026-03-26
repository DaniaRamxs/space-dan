import React, { Suspense, lazy } from 'react';
const StellarMap = lazy(() => import('../pages/StellarMap'));

/**
 * UniversoPage: La vista del ecosistema social de Spacely.
 * Reemplaza la vista estática por un mapa interactivo dinámico.
 */
export default function UniversoPage() {
  return (
    <div className="w-full h-screen bg-[#030308] overflow-hidden">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#030308]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Frecuencias...</span>
          </div>
        </div>
      }>
        <StellarMap />
      </Suspense>
    </div>
  );
}
