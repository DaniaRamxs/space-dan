// src/pages/ArquitecturaPage.jsx

const STACK = [
  {
    icon: "⚛️",
    name: "React 19",
    role: "UI Framework",
    desc: "Componentes funcionales, hooks personalizados, lazy loading por ruta con Suspense para performance óptima.",
    color: "#61dafb",
  },
  {
    icon: "⚡",
    name: "Vite 7",
    role: "Build Tool",
    desc: "HMR ultrarrápido en desarrollo y bundling con code-splitting automático por ruta en producción.",
    color: "#b473f9",
  },
  {
    icon: "🛣️",
    name: "React Router 7",
    role: "Client Routing",
    desc: "SPA con 16+ rutas. Cada página es un chunk JS independiente cargado bajo demanda.",
    color: "#f44250",
  },
  {
    icon: "🎨",
    name: "Tailwind CSS 3",
    role: "Styling",
    desc: "Utilidades base + ~3300 líneas de CSS custom para control total del aesthetic dark/neon/glassmorphism.",
    color: "#38bdf8",
  },
  {
    icon: "🗄️",
    name: "Supabase",
    role: "Backend / DB",
    desc: "PostgreSQL + realtime subscriptions para el libro de visitas global con actualizaciones en vivo.",
    color: "#3ecf8e",
  },
  {
    icon: "🎭",
    name: "Lucide React",
    role: "Icon System",
    desc: "Sistema de iconos consistente con tree-shaking: solo se importan los íconos usados.",
    color: "#fbbf24",
  },
];

const DECISIONS = [
  {
    title: "Lazy loading por ruta",
    icon: "🚀",
    desc: "Cada página es un chunk JS separado. El usuario solo descarga el código de la página que visita, no todo el sitio de golpe.",
  },
  {
    title: "CSS custom sobre Tailwind puro",
    icon: "🎨",
    desc: "Tailwind sirve de base utilitaria, pero el aesthetic neon/glassmorphism requiere control CSS fino: variables, animaciones complejas y keyframes personalizados.",
  },
  {
    title: "SPA sin SSR",
    icon: "📄",
    desc: "Sin contenido dinámico crítico para SEO, una SPA estática es suficiente. Netlify sirve el index.html y React Router maneja el resto en el cliente.",
  },
  {
    title: "Supabase para el guestbook",
    icon: "⚡",
    desc: "En lugar de un backend propio, Supabase ofrece DB + API REST + realtime WebSockets sin servidores que mantener.",
  },
  {
    title: "Componentes de juegos independientes",
    icon: "🎮",
    desc: "Cada uno de los 24 juegos es un componente autocontenido con su propio estado. Se montan/desmontan bajo demanda desde GamesPage.",
  },
  {
    title: "Starfield y CursorTrail en Canvas",
    icon: "✨",
    desc: "Las animaciones de fondo y el cursor usan Canvas API con requestAnimationFrame para máximo rendimiento sin impactar el thread de React.",
  },
];

const TIMELINE = [
  { phase: "01", label: "Base", desc: "Setup Vite + React + Router. Layout principal, sidebar, sistema de rutas." },
  { phase: "02", label: "Diseño", desc: "Sistema de diseño: paleta neon, glassmorphism, tipografía monospace, animaciones CSS." },
  { phase: "03", label: "Contenido", desc: "Páginas core: perfil, posts, galería, watchlist, bulletin board." },
  { phase: "04", label: "Juegos", desc: "24 mini-juegos implementados desde cero: Tetris, Snake, Flappy Bird, Breakout, etc." },
  { phase: "05", label: "Extras", desc: "OS Desktop draggable, Dreamscape, Time Capsule, easter eggs, Konami code." },
  { phase: "06", label: "Backend", desc: "Integración Supabase: guestbook global con realtime subscriptions y contador de visitas." },
];

const STATS = [
  { value: "16+", label: "páginas" },
  { value: "24", label: "juegos" },
  { value: "1", label: "DB realtime" },
  { value: "~3300", label: "líneas CSS" },
  { value: "6", label: "hooks custom" },
  { value: "∞", label: "horas de iteración" },
];

// Árbol de arquitectura de componentes
const TREE = {
  label: "App.jsx",
  sub: "BrowserRouter + Suspense",
  children: [
    {
      label: "Wpage",
      sub: "Landing page",
    },
    {
      label: "GardenLayout",
      sub: "Shell principal",
      children: [
        { label: "StarfieldBg", sub: "Canvas animado" },
        { label: "CursorTrail", sub: "Partículas cursor" },
        { label: "KonamiEasterEgg", sub: "↑↑↓↓←→←→BA" },
        { label: "Sidebar", sub: "Nav + visitas" },
        { label: "Topbar", sub: "Header" },
        {
          label: "Pages (lazy)",
          sub: "16 rutas",
          children: [
            { label: "ProfilePage", sub: "Sobre mí" },
            { label: "GamesPage", sub: "24 juegos" },
            { label: "GuestbookPage", sub: "→ Supabase" },
            { label: "PostsPage / PostPage", sub: "Blog" },
            { label: "DesktopPage", sub: "OS draggable" },
            { label: "+ 11 páginas más", sub: "" },
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

      {/* Header */}
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

      {/* Diagrama de componentes */}
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
