/**
 * PetDisplay — Mascota con accesorios superpuestos.
 * Carga el pet_loadout del usuario y muestra cada slot como
 * una capa posicionada sobre la imagen base del gato.
 *
 * Uso:
 *   <PetDisplay userId="uuid" size={120} />
 */
import { useEffect, useState } from 'react';
import { getPetLoadout } from '../services/store';

const CAT_URL = 'https://autism.crd.co/assets/images/gallery03/45050ba7_original.gif?v=69d6a439';

// Posición y tamaño de cada slot sobre una imagen 100×100
const SLOT_LAYOUT = {
  bg:    { top: '0%',   left: '0%',   width: '100%', height: '100%', zIndex: 0,  fontSize: '80%' },
  body:  { top: '30%',  left: '15%',  width: '70%',  height: '55%',  zIndex: 2,  fontSize: '55%' },
  head:  { top: '-18%', left: '15%',  width: '70%',  height: '50%',  zIndex: 3,  fontSize: '55%' },
  hand:  { top: '50%',  left: '-15%', width: '45%',  height: '40%',  zIndex: 4,  fontSize: '42%' },
  extra: { top: '70%',  left: '55%',  width: '50%',  height: '40%',  zIndex: 5,  fontSize: '42%' },
};

function AccessoryLayer({ slot, item, size }) {
  const layout = SLOT_LAYOUT[slot];
  if (!layout || !item) return null;

  // Convert % layout to px based on size
  const style = {
    position:   'absolute',
    top:        layout.top,
    left:       layout.left,
    width:      layout.width,
    height:     layout.height,
    zIndex:     layout.zIndex,
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    fontSize:   `calc(${size}px * ${parseFloat(layout.fontSize) / 100})`,
    lineHeight: 1,
  };

  // If the item has a preview_url, show it as an image; else show its icon
  return (
    <div style={style} title={item.title}>
      {item.preview_url ? (
        <img
          src={item.preview_url}
          alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
        />
      ) : (
        <span style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
          {item.icon || '✨'}
        </span>
      )}
    </div>
  );
}

export default function PetDisplay({ userId, size = 100, showName = false }) {
  const [loadout, setLoadout] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getPetLoadout(userId)
      .then(data => setLoadout(data))
      .catch(() => {});
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

        {/* Accesorios sobre el gato */}
        {loadout?.body  && <AccessoryLayer slot="body"  item={loadout.body}  size={size} />}
        {loadout?.head  && <AccessoryLayer slot="head"  item={loadout.head}  size={size} />}
        {loadout?.hand  && <AccessoryLayer slot="hand"  item={loadout.hand}  size={size} />}
        {loadout?.extra && <AccessoryLayer slot="extra" item={loadout.extra} size={size} />}

        {/* Indicador de "sin accesorios" en modo debug (solo si no hay nada) */}
        {!hasAnyAccessory && loadout !== null && (
          <div style={{
            position: 'absolute', bottom: -18, left: 0, right: 0,
            textAlign: 'center', fontSize: 10, opacity: 0.4, pointerEvents: 'none',
          }}>
            sin accesorios
          </div>
        )}
      </div>

      {showName && loadout && hasAnyAccessory && (
        <div style={{ fontSize: 10, opacity: 0.5, textAlign: 'center', maxWidth: size }}>
          {[loadout.head, loadout.body, loadout.hand, loadout.extra]
            .filter(Boolean)
            .map(i => i.icon)
            .join(' ')}
        </div>
      )}
    </div>
  );
}
