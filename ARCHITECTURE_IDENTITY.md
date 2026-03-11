# 🌌 Arquitectura: Space Dan Identity & Emotional Universe

Como Arquitecto Senior, esta es la propuesta integral para transformar los perfiles de "fichas de datos" a **Universos Personales**.

---

## 1. El Concepto: "El Pasaporte de Energía"
No estamos guardando strings; estamos proyectando una presencia digital. La arquitectura se basa en tres pilares:
1.  **Vibración (Estética):** Nicknames y Themes.
2.  **Casta (Roles):** Identidad social y privilegios arquitectónicos.
3.  **Estado (Mood/Energía):** Datos volátiles que humanizan el código.

---

## 2. Estrategia de Performance (Arquitectura Minimalista)

### A. Nicknames con Partículas (Zero-Node Solution)
Para evitar el lag en leaderboards con muchos usuarios:
- **No JS Loops:** Las partículas se generan con `background-image: radial-gradient` animados mediante `background-position`.
- **Efectos:** El Halo y la Órbita usan `box-shadow` y pseudo-elementos (`::before`).
- **CSS Houdini (Opcional):** Si el navegador lo soporta, para degradados más suaves.

### B. Sistema de Temas (Atómico con CSS Variables)
El `equipped_theme` inyecta variables en `:root`:
```css
/* Ejemplo de Nebula Theme */
:root[data-theme="nebula"] {
  --u-bg: #05020a;
  --u-accent: #6d28d9;
  --u-text-secondary: 'Space Grotesk', sans-serif;
  --u-card-opacity: 0.15;
  --u-glow: 0 0 20px rgba(109, 40, 217, 0.4);
}
```

---

## 3. Estado Global (React Context)

Usaremos un `UniverseProvider` que envuelve la app.
```javascript
const UniverseContext = createContext();

export const UniverseProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeTheme, setActiveTheme] = useState('system');
  
  // Sincronización automática con Supabase al cargar el perfil
  useEffect(() => {
    if (user?.equipped_theme) {
      document.documentElement.setAttribute('data-theme', user.equipped_theme);
    }
  }, [user]);

  return (
    <UniverseContext.Provider value={{ theme: activeTheme }}>
      {children}
    </UniverseContext.Provider>
  );
};
```

---

## 4. Ejemplo de Implementación: Nickname Estilizado

```jsx
// Perfil.jsx o Leaderboard.jsx
import './NicknameStyles.css';

export const StyledNickname = ({ username, styleId }) => {
  return (
    <span className={`nick-base nick-style-${styleId}`}>
      {username}
    </span>
  );
};
```

```css
/* NicknameStyles.css */
.nick-base {
  font-weight: 800;
  position: relative;
  display: inline-block;
}

/* Ejemplo: Estilo 'Cosmic Dust' */
.nick-style-cosmic-dust {
  background: linear-gradient(90deg, #00e5ff, #ff00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
}

.nick-style-cosmic-dust::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: radial-gradient(circle, #fff 1px, transparent 1px);
  background-size: 10px 10px;
  mask-image: linear-gradient(to right, transparent, black, transparent);
  animation: bg-drift 10s linear infinite;
  opacity: 0.4;
  pointer-events: none;
}

@keyframes bg-drift {
  from { background-position: 0 0; }
  to { background-position: 100px 50px; }
}
```

---

## 5. Diseño de Experiencia Emocional
- **El Mood es efímero:** Fomenta que el usuario actualice su estado cada día (como un "faro" de su día).
- **Ambiente Sonoro Progresivo:** Al entrar a un perfil con sonido, el botón de "Play Ambiente" parpadea sutilmente en color acorde al theme, invitando de forma no agresiva.
- **Pasaporte Digital:** El link `@usuario` no abre un dashboard, abre una **escena**. Todo el contenido (posts, fotos, logros) está subordinado a la estética del universo de ese usuario.

---

## 6. Plan de Escalabilidad
1.  **Fase 1 (Cimientos):** Migración SQL y extensión de `profiles`.
2.  **Fase 2 (Visual):** Motor de CSS Variables y primeros 3 temas (Minimal, Nebula, Terminal).
3.  **Fase 3 (Economía):** Integración con la tienda existente (Store.jsx).
4.  **Fase 4 (Social):** Generación de OG Images dinámicas para que al pasar el link por Discord/WhatsApp se vea el pasaporte renderizado.
