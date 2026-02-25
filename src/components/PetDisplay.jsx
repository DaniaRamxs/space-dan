/**
 * PetDisplay — Mascota con accesorios SVG animados.
 * Carga el pet_loadout del usuario y muestra cada slot como
 * una capa SVG posicionada sobre la imagen base del gato.
 *
 * Uso:
 *   <PetDisplay userId="uuid" size={120} />
 */
import { useEffect, useState } from 'react';
import { getPetLoadout } from '../services/store';
import PetAccessorySVG from './PetAccessorySVG';

const CAT_URL = 'https://autism.crd.co/assets/images/gallery03/45050ba7_original.gif?v=69d6a439';

// Posición y tamaño de cada slot sobre una imagen 100×100 (en %)
const SLOT_LAYOUT = {
  bg: { top: '0%', left: '0%', width: '100%', height: '100%', zIndex: 0 },
  body: { top: '30%', left: '15%', width: '70%', height: '55%', zIndex: 2 },
  head: { top: '-18%', left: '15%', width: '70%', height: '50%', zIndex: 3 },
  hand: { top: '50%', left: '-15%', width: '45%', height: '40%', zIndex: 4 },
  extra: { top: '10%', left: '15%', width: '70%', height: '40%', zIndex: 5 },
};

function AccessoryLayer({ slot, item, size }) {
  const layout = SLOT_LAYOUT[slot];
  if (!layout || !item) return null;

  const svgId = item.metadata?.svg_id;
  const layerSize = Math.round(size * (parseFloat(layout.width) / 100));

  const style = {
    position: 'absolute',
    top: layout.top,
    left: layout.left,
    width: layout.width,
    height: layout.height,
    zIndex: layout.zIndex,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  return (
    <div style={style} title={item.title}>
      <PetAccessorySVG svgId={svgId} icon={item.icon} size={layerSize} />
    </div>
  );
}

export default function PetDisplay({ userId, size = 100, showName = false }) {
  const [loadout, setLoadout] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getPetLoadout(userId)
      .then(data => setLoadout(data))
      .catch(() => { });
  }, [userId]);

  const hasAnyAccessory = loadout && (
    loadout.head || loadout.body || loadout.hand || loadout.bg || loadout.extra
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          imageRendering: 'pixelated',
        }}
      >
        {/* Fondo de accesorio (bg slot — detrás del gato) */}
        {loadout?.bg && (
          <AccessoryLayer slot="bg" item={loadout.bg} size={size} />
        )}

        {/* Gato base */}
        <img
          src={CAT_URL}
          alt="mascota"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Accesorios SVG animados sobre el gato */}
        {loadout?.body && <AccessoryLayer slot="body" item={loadout.body} size={size} />}
        {loadout?.head && <AccessoryLayer slot="head" item={loadout.head} size={size} />}
        {loadout?.hand && <AccessoryLayer slot="hand" item={loadout.hand} size={size} />}
        {loadout?.extra && <AccessoryLayer slot="extra" item={loadout.extra} size={size} />}
      </div>

      {showName && loadout && hasAnyAccessory && (
        <div style={{
          fontSize: 9,
          opacity: 0.4,
          textAlign: 'center',
          maxWidth: size,
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}>
          {[loadout.head, loadout.body, loadout.hand, loadout.extra]
            .filter(Boolean)
            .map(i => i.title)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
