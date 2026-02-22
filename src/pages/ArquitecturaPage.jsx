// src/pages/ArquitecturaPage.jsx

const STACK = [
  {
    icon: "⚛️",
    name: "React 19",
    role: "UI Framework",
    desc: "Componentes funcionales, hooks personalizados, lazy loading por ruta con Suspense. Sistema de eventos custom para comunicación entre componentes sin prop-drilling.",
    color: "#61dafb",
  },
  {
    icon: "⚡",
    name: "Vite 7",
    role: "Build Tool",
    desc: "HMR ultrarrápido en desarrollo y bundling con code-splitting automático por ruta. Cada página es un chunk JS independiente descargado bajo demanda.",
    color: "#b473f9",
  },
  {
    icon: "🛣️",
    name: "React Router 7",
    role: "Client Routing",
    desc: "SPA con 20 rutas. Navegación instantánea entre páginas sin recarga. Integrado con lazy() para cargar solo el chunk necesario.",
    color: "#f44250",
  },
  {
    icon: "🎨",
    name: "CSS Custom",
    role: "Styling",
    desc: "~5300 líneas de CSS propio: variables de diseño, glassmorphism, animaciones neon, responsive completo y temas desbloqueables vía localStorage.",
    color: "#38bdf8",
  },
  {
    icon: "🗄️",
    name: "Supabase",
    role: "Backend / DB",
    desc: "PostgreSQL + realtime subscriptions para el libro de visitas global. Actualizaciones en vivo sin servidor propio.",
    color: "#3ecf8e",
  },
  {
    icon: "🎮",
    name: "Canvas API",
    role: "Gráficos & Juegos",
    desc: "24 minijuegos, fondo de estrellas animado, visualizador de audio y 4 screensavers implementados con Canvas 2D y requestAnimationFrame.",
    color: "#fbbf24",
  },
  {
    icon: "🌐",
    name: "APIs externas",
    role: "Integraciones",
    desc: "GitHub API (proyectos y stats), Last.fm API (canción en vivo), CounterAPI (visitas globales) y streams de radio online.",
    color: "#ff6eb4",
  },
];

const DECISIONS = [
  {
    title: "Lazy loading por ruta",
    icon: "🚀",
    desc: "Cada página es un chunk JS separado. El usuario descarga solo lo que visita, no el sitio completo. Implementado con React.lazy() + Suspense.",
  },
  {
    title: "CSS custom sobre framework",
    icon: "🎨",
    desc: "El aesthetic neon/glassmorphism requiere control CSS fino: variables de diseño, keyframes personalizados y pseudo-elementos. Un framework de utilidades no alcanza para esto.",
  },
  {
    title: "SPA sin SSR",
    icon: "📄",
    desc: "Sin contenido crítico para SEO, una SPA estática es suficiente. Netlify sirve el index.html y React Router maneja el resto en el cliente.",
  },
  {
    title: "Supabase para el guestbook",
    icon: "⚡",
    desc: "En lugar de un backend propio, Supabase ofrece DB + API REST + realtime WebSockets sin servidores que mantener ni costos variables.",
  },
  {
    title: "Sistema de gamificación con localStorage",
    icon: "◈",
    desc: "Dancoins, logros y tienda viven en localStorage con eventos custom (dan:coins-changed, dan:achievement-unlocked, dan:item-purchased) para sincronizar cualquier componente sin context global.",
  },
  {
    title: "Canvas API para animaciones de fondo",
    icon: "✨",
    desc: "El starfield, cursor trail y screensavers usan Canvas con requestAnimationFrame. Corren fuera del ciclo de React para no bloquear el thread principal.",
  },
  {
    title: "Componentes de juegos autocontenidos",
    icon: "🎮",
    desc: "Cada uno de los 24 juegos es un componente aislado con su propio estado. Se montan/desmontan bajo demanda desde GamesPage sin afectar el resto.",
  },
  {
    title: "Integración Last.fm por polling",
    icon: "🎧",
    desc: "El widget de Last.fm consulta la API cada 30 segundos. Sin WebSockets de Spotify directos: requiere que Spotify esté vinculado a Last.fm para el scrobbling.",
  },
];

const TIMELINE = [
  { phase: "01", label: "Base",            desc: "Setup Vite + React + Router. Layout principal, sidebar, sistema de rutas." },
  { phase: "02", label: "Diseño",          desc: "Sistema de diseño: paleta neon, glassmorphism, tipografía monospace, animaciones CSS, starfield canvas." },
  { phase: "03", label: "Contenido",       desc: "Páginas core: perfil, posts, galería, watchlist, kinnies, tests, bulletin board." },
  { phase: "04", label: "Juegos",          desc: "24 minijuegos implementados desde cero con Canvas 2D: Tetris, Snake, Flappy Bird, Breakout, 2048 y más." },
  { phase: "05", label: "Interactividad",  desc: "OS Desktop draggable, Dreamscape, Time Capsule, easter eggs, Konami code, shoutbox." },
  { phase: "06", label: "Backend",         desc: "Integración Supabase: guestbook global con realtime. Contador de visitas. GitHub API para proyectos." },
  { phase: "07", label: "Gamificación",    desc: "Sistema Dancoins + 16 logros + tienda. Radio en vivo, screensaver, Last.fm widget, temas de estrellas desbloqueables." },
];

const STATS = [
  { value: "18+",   label: "páginas"           },
  { value: "24",    label: "juegos"             },
  { value: "1",     label: "DB realtime"        },
  { value: "~5300", label: "líneas CSS"         },
  { value: "6",     label: "hooks custom"       },
  { value: "16",    label: "logros"             },
];

const TREE = {
  label: "App.jsx",
  sub: "BrowserRouter + Suspense",
  children: [
    { label: "AchievementToast", sub: "Notificaciones logros" },
    { label: "Screensaver",      sub: "30s inactividad" },
    { label: "Wpage",            sub: "Landing page" },
    {
      label: "GardenLayout",
      sub: "Shell principal",
      children: [
        { label: "StarfieldBg",      sub: "Canvas + temas tienda" },
        { label: "CursorTrail",      sub: "Partículas cursor" },
        { label: "KonamiEasterEgg",  sub: "↑↑↓↓←→←→BA" },
        { label: "RadioPlayer",      sub: "Radio en vivo" },
        { label: "LastFmWidget",     sub: "Sidebar now-playing" },
        { label: "Sidebar",          sub: "Nav + visitas + Dancoins" },
        { label: "Topbar",           sub: "Header + hamburger" },
        {
          label: "Pages (lazy)",
          sub: "20 rutas",
          children: [
            { label: "ProfilePage",      sub: "+ LastFmNowPlaying" },
            { label: "GamesPage",        sub: "24 juegos" },
            { label: "GuestbookPage",    sub: "→ Supabase RT" },
            { label: "DesktopPage",      sub: "OS draggable" },
            { label: "ProjectsPage",     sub: "→ GitHub API" },
            { label: "ShopPage",         sub: "Tienda Dancoins" },
            { label: "AchievementsPage", sub: "16 logros" },
            { label: "+ 13 páginas más", sub: "" },
          ],
        },
      ],
    },
  ],
};

function TreeNode({ node, depth = 0 }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className={`archTreeNode depth-${depth}`}>
      <div className="archTreeLabel">
        <span className="archTreeName">{node.label}</span>
        {node.sub && <span className="archTreeSub">{node.sub}</span>}
      </div>
      {hasChildren && (
        <div className="archTreeChildren">
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArquitecturaPage() {
  return (
    <main className="card archPage">

      <div className="pageHeader">
        <h1 style={{ margin: 0 }}>🏗️ Arquitectura</h1>
        <p className="tinyText">cómo está construido este sitio — stack, decisiones y proceso</p>
      </div>

      {/* Stats bar */}
      <div className="archStats">
        {STATS.map((s) => (
          <div className="archStatItem" key={s.label}>
            <span className="archStatValue">{s.value}</span>
            <span className="archStatLabel">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <section className="archSection">
        <h2 className="archSectionTitle">⚙️ Tech Stack</h2>
        <div className="archStackGrid">
          {STACK.map((tech) => (
            <div className="archStackCard" key={tech.name} style={{ "--card-accent": tech.color }}>
              <div className="archStackIcon">{tech.icon}</div>
              <div className="archStackInfo">
                <div className="archStackName">{tech.name}</div>
                <div className="archStackRole">{tech.role}</div>
                <div className="archStackDesc">{tech.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Árbol de componentes */}
      <section className="archSection">
        <h2 className="archSectionTitle">🗺️ Árbol de Componentes</h2>
        <p className="archSectionNote">estructura de la aplicación desde el root hasta las páginas</p>
        <div className="archTreeWrap">
          <TreeNode node={TREE} />
        </div>
      </section>

      {/* Decisiones de diseño */}
      <section className="archSection">
        <h2 className="archSectionTitle">💡 Decisiones de Diseño</h2>
        <div className="archDecisionGrid">
          {DECISIONS.map((d) => (
            <div className="archDecisionCard" key={d.title}>
              <div className="archDecisionIcon">{d.icon}</div>
              <div>
                <div className="archDecisionTitle">{d.title}</div>
                <div className="archDecisionDesc">{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="archSection">
        <h2 className="archSectionTitle">📅 Proceso de Desarrollo</h2>
        <div className="archTimeline">
          {TIMELINE.map((t, i) => (
            <div className="archTimelineItem" key={i}>
              <div className="archTimelineDot">
                <span className="archTimelinePhase">{t.phase}</span>
              </div>
              <div className="archTimelineContent">
                <div className="archTimelineLabel">{t.label}</div>
                <div className="archTimelineDesc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
