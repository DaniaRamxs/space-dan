import { useState } from 'react';

const NODES = [
  { id: 'dan',          x: 300, y: 200, r: 32, color: '#ff6eb4', type: 'center', label: 'dan' },

  { id: 'personalidad', x: 300, y: 70,  r: 24, color: '#ff6eb4', type: 'cat',    label: 'personalidad' },
  { id: 'anime',        x: 185, y: 135, r: 24, color: '#c77dff', type: 'cat',    label: 'anime · manga' },
  { id: 'cine',         x: 415, y: 135, r: 24, color: '#00e5ff', type: 'cat',    label: 'cine · series' },
  { id: 'gustos',       x: 185, y: 265, r: 24, color: '#39ff14', type: 'cat',    label: 'gustos' },
  { id: 'filosofia',    x: 415, y: 265, r: 24, color: '#f4a261', type: 'cat',    label: 'filosofía' },
  { id: 'musica',       x: 300, y: 330, r: 24, color: '#00e5ff', type: 'cat',    label: 'música' },

  // personalidad
  { id: 'intj',         x: 240, y: 10,  r: 15, color: '#c77dff', type: 'item',   label: 'INTJ' },
  { id: 'slytherin',    x: 300, y: -12, r: 15, color: '#39ff14', type: 'item',   label: 'Slytherin' },
  { id: 'enea',         x: 360, y: 10,  r: 15, color: '#ff6eb4', type: 'item',   label: '5w6' },

  // anime / manga
  { id: 'beastars',     x: 88,  y: 65,  r: 15, color: '#c77dff', type: 'item',   label: 'Beastars' },
  { id: 'punpun',       x: 118, y: 28,  r: 15, color: '#c77dff', type: 'item',   label: 'Punpun' },
  { id: 'tpn',          x: 200, y: 42,  r: 15, color: '#c77dff', type: 'item',   label: 'Neverland' },
  { id: 'hxh',          x: 88,  y: 168, r: 15, color: '#c77dff', type: 'item',   label: 'HxH' },

  // cine / series
  { id: 'hp',           x: 468, y: 72,  r: 15, color: '#00e5ff', type: 'item',   label: 'Harry Potter' },
  { id: 'lotr',         x: 505, y: 135, r: 15, color: '#00e5ff', type: 'item',   label: 'LOTR' },
  { id: 'arcane',       x: 468, y: 198, r: 15, color: '#00e5ff', type: 'item',   label: 'Arcane' },
  { id: 'tbbt',         x: 432, y: 52,  r: 15, color: '#00e5ff', type: 'item',   label: 'Big Bang' },

  // gustos
  { id: 'cafe',         x: 102, y: 218, r: 15, color: '#c8843a', type: 'item',   label: 'café' },
  { id: 'invierno',     x: 88,  y: 268, r: 15, color: '#74c0fc', type: 'item',   label: 'invierno' },
  { id: 'gato',         x: 102, y: 318, r: 15, color: '#adb5bd', type: 'item',   label: 'gato negro' },

  // filosofía
  { id: 'absurdismo',   x: 505, y: 265, r: 15, color: '#f4a261', type: 'item',   label: 'absurdismo' },
  { id: 'neutral',      x: 468, y: 325, r: 15, color: '#adb5bd', type: 'item',   label: 'true neutral' },
];

const EDGES = [
  ['dan', 'personalidad'], ['dan', 'anime'], ['dan', 'cine'],
  ['dan', 'gustos'], ['dan', 'filosofia'], ['dan', 'musica'],
  ['personalidad', 'intj'], ['personalidad', 'slytherin'], ['personalidad', 'enea'],
  ['anime', 'beastars'], ['anime', 'punpun'], ['anime', 'tpn'], ['anime', 'hxh'],
  ['cine', 'hp'], ['cine', 'lotr'], ['cine', 'arcane'], ['cine', 'tbbt'],
  ['gustos', 'cafe'], ['gustos', 'invierno'], ['gustos', 'gato'],
  ['filosofia', 'absurdismo'], ['filosofia', 'neutral'],
];

const FS = { center: 18, cat: 15, item: 13 };

export default function UniversoPage() {
  const [hovered, setHovered] = useState(null);

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  const adjacent = {};
  NODES.forEach(n => { adjacent[n.id] = new Set(); });
  EDGES.forEach(([a, b]) => { adjacent[a].add(b); adjacent[b].add(a); });

  const nodeActive = id => !hovered || id === hovered || adjacent[hovered]?.has(id);
  const edgeActive = (a, b) => !hovered || a === hovered || b === hovered;

  return (
    <main className="card">
      <div className="pageHeader">
        <h1>universo</h1>
        <p className="tinyText">mis intereses y cómo se conectan 🌌</p>
      </div>

      <div className="universoWrap">
        <svg
          viewBox="-30 -40 660 490"
          className="universoSvg"
          aria-label="Mapa de intereses de dan"
        >
          <defs>
            <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {EDGES.map(([a, b]) => {
            const na = nodeMap[a], nb = nodeMap[b];
            const active = edgeActive(a, b);
            return (
              <line
                key={`${a}-${b}`}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={active ? na.color : 'rgba(255,255,255,0.05)'}
                strokeWidth={active ? 1.8 : 0.8}
                opacity={active ? 0.65 : 1}
                style={{ transition: 'stroke 0.2s, opacity 0.2s, stroke-width 0.2s' }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map(node => {
            const active = nodeActive(node.id);
            const isCenter = node.type === 'center';
            const isCat   = node.type === 'cat';
            const fs = FS[node.type];
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                <circle
                  r={node.r}
                  fill={active ? `${node.color}22` : 'transparent'}
                  stroke={active ? node.color : 'rgba(255,255,255,0.07)'}
                  strokeWidth={isCenter ? 2.5 : isCat ? 2 : 1.5}
                  filter={active && (isCenter || isCat) ? 'url(#nodeGlow)' : undefined}
                  style={{ transition: 'all 0.2s' }}
                />
                {isCenter ? (
                  <text
                    x="0" y="0"
                    textAnchor="middle" dominantBaseline="central"
                    fill={active ? node.color : 'rgba(255,255,255,0.2)'}
                    fontSize={fs} fontWeight="900"
                    style={{ transition: 'fill 0.2s', pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>
                ) : (
                  <text
                    x="0" y={node.r + fs + 2}
                    textAnchor="middle"
                    fill={active ? node.color : 'rgba(255,255,255,0.1)'}
                    fontSize={fs} fontWeight={isCat ? 700 : 400}
                    style={{ transition: 'fill 0.2s', pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="universoHint">pasa el cursor sobre un nodo para ver sus conexiones</p>
      </div>
    </main>
  );
}
