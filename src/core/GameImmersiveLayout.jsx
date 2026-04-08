import React from 'react'

/**
 * Layout envoltorio para juegos (stub de compilacion).
 * En la app completa aqui irian fondos, UI HUD y transiciones.
 */
export function GameImmersiveLayout({ children }) {
  return <div className="min-h-screen w-full flex items-center justify-center p-4">{children}</div>
}

export default GameImmersiveLayout

