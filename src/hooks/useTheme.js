// CSS variables overridden per theme
const THEME_VARS = [
  '--bg', '--accent', '--accent-glow', '--accent-dim',
  '--cyan', '--cyan-glow', '--status-green', '--glow',
];

export const THEMES = {
  theme_forest: {
    label: 'Bosque Digital',
    vars: {
      '--bg':           '#060d07',
      '--accent':       '#39ff14',
      '--accent-glow':  'rgba(57, 255, 20, 0.25)',
      '--accent-dim':   'rgba(57, 255, 20, 0.12)',
      '--cyan':         '#00ff88',
      '--cyan-glow':    'rgba(0, 255, 136, 0.20)',
      '--status-green': '#00ff88',
      '--glow':         'rgba(57, 255, 20, 0.20)',
    },
  },
  theme_ocean: {
    label: 'Deep Ocean',
    vars: {
      '--bg':           '#040c16',
      '--accent':       '#00c6ff',
      '--accent-glow':  'rgba(0, 198, 255, 0.25)',
      '--accent-dim':   'rgba(0, 198, 255, 0.12)',
      '--cyan':         '#0072ff',
      '--cyan-glow':    'rgba(0, 114, 255, 0.20)',
      '--status-green': '#00e5ff',
      '--glow':         'rgba(0, 180, 255, 0.25)',
    },
  },
  theme_sunset: {
    label: 'Sunset Retrowave',
    vars: {
      '--bg':           '#0e070e',
      '--accent':       '#ff6b35',
      '--accent-glow':  'rgba(255, 107, 53, 0.25)',
      '--accent-dim':   'rgba(255, 107, 53, 0.12)',
      '--cyan':         '#ff0090',
      '--cyan-glow':    'rgba(255, 0, 144, 0.20)',
      '--status-green': '#ffaa00',
      '--glow':         'rgba(255, 80, 100, 0.25)',
    },
  },
  theme_hacker: {
    label: 'Terminal Verde',
    vars: {
      '--bg':           '#000800',
      '--accent':       '#39ff14',
      '--accent-glow':  'rgba(57, 255, 20, 0.30)',
      '--accent-dim':   'rgba(57, 255, 20, 0.10)',
      '--cyan':         '#00ff00',
      '--cyan-glow':    'rgba(0, 255, 0, 0.20)',
      '--status-green': '#39ff14',
      '--glow':         'rgba(57, 255, 20, 0.25)',
    },
  },
  theme_mono: {
    label: 'Mono Minimal',
    vars: {
      '--bg':           '#0e0e0e',
      '--accent':       '#f0f0f0',
      '--accent-glow':  'rgba(240, 240, 240, 0.18)',
      '--accent-dim':   'rgba(240, 240, 240, 0.08)',
      '--cyan':         '#888888',
      '--cyan-glow':    'rgba(136, 136, 136, 0.15)',
      '--status-green': '#aaaaaa',
      '--glow':         'rgba(200, 200, 200, 0.15)',
    },
  },
};

/** Apply a theme by id, or reset to default cyberpunk if id is falsy / 'theme_default' */
export function applyTheme(themeId) {
  const root = document.documentElement;
  THEME_VARS.forEach(v => root.style.removeProperty(v));

  if (themeId && themeId !== 'theme_default' && THEMES[themeId]) {
    Object.entries(THEMES[themeId].vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }

  try { localStorage.setItem('space-dan-theme', themeId || 'theme_default'); } catch {}
}

/** Call once at app startup to restore saved theme */
export function loadSavedTheme() {
  try {
    const saved     = localStorage.getItem('space-dan-theme');
    const purchased = JSON.parse(localStorage.getItem('space-dan-shop-purchased') || '[]');
    if (saved && saved !== 'theme_default' && purchased.includes(saved)) {
      applyTheme(saved);
    }
  } catch {}
}
