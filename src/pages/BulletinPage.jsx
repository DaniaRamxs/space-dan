import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const bulletinPosts = [
  { id: 1, date: "2026-01-03", title: "Primer boletín", text: "Hola, estreno el boletín.", tags: ["general"] },
  { id: 2, date: "2026-01-03", title: "Status", text: "Todavía sin novedades, poniendo el sitio en orden.", tags: ["general"] },
  { id: 3, date: "2026-01-09", title: "Blog online", text: "Actualicé el blog y agregué la sección de posts.", tags: ["update", "blog"] },
  { id: 4, date: "2026-01-18", title: "Kinnies en camino", text: "Tengo la idea de agregar mis kinnies a la página en una sección donde se vean todos los personajes :3", tags: ["update"] },
  { id: 5, date: "2026-01-18", title: "Música en el perfil", text: "Agregué una sección de música en el perfil, la iré ampliando.", tags: ["update", "música"] },
  { id: 6, date: "2026-01-18", title: "Advertencia de entrada", text: "Agregué una advertencia al ingresar a la página por primera vez.", tags: ["update"] },
  { id: 7, date: "2026-02-17", title: "Rediseño visual completo", text: "Rehíce todo el diseño visual. Ahora tiene estética Y2K dark con colores neon magenta y cyan, glassmorphism oscuro y animaciones retro.", tags: ["diseño", "update"] },
  { id: 8, date: "2026-02-17", title: "Logo animado", text: "El logo space-dan ahora tiene gradiente animado magenta→cyan y un efecto glitch cada cierto tiempo.", tags: ["diseño"] },
  { id: 9, date: "2026-02-17", title: "Hamburger menu", text: "Agregué menú hamburger para mobile. El sidebar ahora se desliza desde la izquierda en pantallas pequeñas.", tags: ["update", "mobile"] },
  { id: 10, date: "2026-02-17", title: "Nav modernizado", text: "Los links del nav son ahora glass cards individuales con borde neon al hacer hover.", tags: ["diseño"] },
  { id: 11, date: "2026-02-17", title: "Cursor trail", text: "El cursor ahora deja partículas neon magenta y cyan al moverse por la página.", tags: ["diseño"] },
  { id: 12, date: "2026-02-17", title: "Konami code", text: "Agregué un easter egg secreto. Pista: ↑↑↓↓←→←→BA :3", tags: ["easter egg"] },
  { id: 13, date: "2026-02-17", title: "Contador de visitas real", text: "El contador del sidebar ahora es real, cuenta visitas de todos los usuarios via counterapi.dev.", tags: ["update"] },
  { id: 14, date: "2026-02-17", title: "Fondo de estrellas propio", text: "Reemplacé el gif de fondo por un campo de estrellas animado en Canvas. 180 estrellas con parpadeo y estrellas neon ocasionales.", tags: ["diseño"] },
  { id: 15, date: "2026-02-17", title: "Sección de juegos", text: "Nueva sección /games con minijuegos implementados desde cero: Snake, Memory, Tic Tac Toe, 2048, Breakout, Space Invaders, Asteroids y más.", tags: ["update", "juegos"] },
  { id: 16, date: "2026-02-17", title: "Animación de páginas", text: "Cada sección ahora tiene un fade-in suave al cargar.", tags: ["diseño"] },
  { id: 17, date: "2026-02-17", title: "Boletín rediseñado", text: "El boletín ahora tiene diseño de timeline vertical con puntos neon y línea conectando las entradas.", tags: ["diseño", "blog"] },
  { id: 18, date: "2026-02-18", title: "Nueva sección: kinnies", text: "Agregué /kinnies con los personajes con los que más me identifico: Legoshi, Norman, Isobe y Shizuku Murasaki.", tags: ["update", "kinnies"] },
  { id: 19, date: "2026-02-18", title: "Nueva sección: tests", text: "Nueva sección /tests con cards de tests y arquetipos: MBTI, Eneagrama, Tritype, Hogwarts, Zodiaco y más.", tags: ["update"] },
  { id: 20, date: "2026-02-18", title: "Nueva sección: galería", text: "Galería /galeria estilo masonry con imágenes. Click en cualquier imagen para verla en grande.", tags: ["update"] },
  { id: 21, date: "2026-02-18", title: "Nueva sección: watchlist", text: "Nueva sección /watchlist con todo lo que vi, estoy viendo o planeo ver. Incluye filtros por tipo: anime, serie, manga y película.", tags: ["update"] },
  { id: 22, date: "2026-02-21", title: "OS Desktop interactivo", text: "Nueva experiencia /desktop con ventanas arrastrables, terminal con comandos reales, menú START, menú de contexto y barra de tareas estilo Windows 9x neon.", tags: ["update", "interactivo"] },
  { id: 23, date: "2026-02-21", title: "Dreamscape", text: "Explora la oscuridad en /dreamscape. Toca las luces para revelar pensamientos y datos curiosos sobre mí.", tags: ["update", "interactivo"] },
  { id: 24, date: "2026-02-21", title: "Time Capsule", text: "Una bóveda temporal en /timecapsule con estética hacker y cuenta regresiva. ¿Qué habrá dentro?", tags: ["update", "interactivo"] },
  { id: 25, date: "2026-02-21", title: "Code splitting", text: "Implementé lazy loading por ruta con React Suspense. La página descarga solo el código de la sección que visitas.", tags: ["update", "performance"] },
  { id: 26, date: "2026-02-21", title: "Responsive total", text: "Todas las secciones son 100% responsivas. El desktop y el dreamscape funcionan bien en celulares.", tags: ["update", "mobile"] },
  { id: 27, date: "2026-02-21", title: "Limpieza de secciones", text: "Eliminé la antigua sección del cuarto para mantener el sitio más enfocado.", tags: ["update"] },
  { id: 28, date: "2026-02-21", title: "Libro de visitas", text: "¡Estrenamos guestbook! Deja tu firma y un mensaje. Construido con Supabase y actualizaciones en tiempo real.", tags: ["update", "comunidad"] },
  { id: 29, date: "2026-02-21", title: "Chat en el Desktop", text: "El shoutbox global es ahora una app del escritorio /desktop, re-estilizado como Chat.exe con look Windows 98.", tags: ["update", "interactivo"] },
  { id: 30, date: "2026-02-21", title: "Sistema Dancoins", text: "Implementé un sistema de monedas propio: gana Dancoins visitando páginas, jugando minijuegos y reclamando el bonus diario.", tags: ["update", "gamificación"] },
  { id: 31, date: "2026-02-21", title: "16 logros desbloqueables", text: "Sistema de achievements: 16 logros que se desbloquean explorando el sitio, jugando, visitando a distintas horas o encontrando secretos. Cada logro otorga Dancoins.", tags: ["update", "gamificación"] },
  { id: 32, date: "2026-02-21", title: "Tienda (TIENDA.exe)", text: "Nueva tienda /tienda: gasta Dancoins en personalización. Cursores con trail de colores, screensavers, temas de fondo estelar y estaciones de radio extra.", tags: ["update", "gamificación"] },
  { id: 33, date: "2026-02-21", title: "Radio en vivo 📻", text: "Botón de radio fijo en la esquina inferior derecha. Estaciones disponibles: Nightwave Plaza y Dan FM Lofi. Desbloquea J-Core y Groove Salad en la tienda.", tags: ["update", "música"] },
  { id: 34, date: "2026-02-21", title: "Screensaver", text: "El sitio activa un screensaver tras 30 segundos de inactividad: starfield por defecto, y Matrix Rain, DVD Bounce y Tuberías 3D como ítems de tienda.", tags: ["update", "interactivo"] },
  { id: 35, date: "2026-02-21", title: "Widget Last.fm", text: "Integré Last.fm en el sidebar y el perfil. Si tengo algo sonando en Spotify (con scrobbling activado), el widget lo muestra en tiempo real.", tags: ["update", "música"] },
  { id: 36, date: "2026-02-21", title: "Sección de proyectos", text: "Nueva sección /proyectos con mis repos de GitHub via GitHub API. Muestra stars, forks, lenguajes y descripción en tiempo real.", tags: ["update"] },
  { id: 37, date: "2026-02-21", title: "Página de arquitectura", text: "Nueva sección /arquitectura mostrando el stack completo, árbol de componentes, decisiones técnicas y proceso de desarrollo.", tags: ["update"] },
  { id: 38, date: "2026-02-22", title: "Estrellas de la tienda", text: "Los temas de estrellas comprados en la tienda ahora cambian el color del fondo estelar en tiempo real. Azul, verde o rojo.", tags: ["update", "gamificación", "diseño"] },
  { id: 39, date: "2026-02-22", title: "Fix: screensaver", text: "Corregido un bug donde el screensaver se activaba y se cerraba solo inmediatamente por un problema de stale closure en React.", tags: ["fix"] },
  { id: 40, date: "2026-02-22", title: "Mejoras móvil en tienda", text: "Las tarjetas de la tienda ahora tienen layout horizontal en móviles y botones más grandes para el tacto.", tags: ["update", "mobile"] },
  { id: 41, date: "2026-02-22", title: "OS Desktop mejorado", text: "Añadí calculadora funcional, bloc de notas, player WinAmp y +15 comandos de terminal. También: comando open [app] para abrir ventanas desde la terminal.", tags: ["update", "interactivo"] },
  { id: 42, date: "2026-02-22", title: "OS Desktop en móvil", text: "El escritorio es ahora 100% táctil: íconos en grid, doble-tap para abrir ventanas, calc con botones grandes, terminal y notepad sin zoom iOS, botón APPS en taskbar.", tags: ["update", "mobile", "interactivo"] },
  { id: 43, date: "2026-02-22", title: "Fix: barra de tareas iOS", text: "La barra de tareas del OS no aparecía en Safari iOS. Causa: 100vh incluye el chrome del browser + overflow:hidden la recortaba. Fix: 100dvh + env(safe-area-inset-bottom).", tags: ["fix", "mobile"] },
  { id: 44, date: "2026-02-22", title: "Deploy: Netlify → Vercel", text: "Migré el proyecto a Vercel y añadí vercel.json con rewrite catch-all. Las rutas de React Router ya no dan 404 al recargar.", tags: ["update", "performance"] },
  { id: 45, date: "2026-02-21", title: "4 nuevos logros del OS", text: "Nuevos achievements del escritorio: Usuario del OS, Hacker, Multitarea y Dev Mode. Cada uno otorga Dancoins.", tags: ["update", "gamificación"] },
  { id: 46, date: "2026-02-23", title: "PWA & Cache Cleanup", text: "Implementé Service Workers con PWA. El sitio ahora funciona offline y limpia automáticamente archivos viejos en cada despliegue.", tags: ["update", "performance"] },
  { id: 47, date: "2026-02-24", title: "Identidad Profesional", text: "Sistema de identidad renovado: ahora puedes elegir tu @username único. Los nombres son case-insensitive y tienen un cooldown de 30 días para fomentar la estabilidad.", tags: ["update", "identidad"] },
  { id: 48, date: "2026-02-24", title: "Login Multi-Provider", text: "Soporte completo para Google y Discord con vinculación de perfiles. Tu identidad en Dan-Space es independiente del proveedor de login.", tags: ["update", "seguridad"] },
  { id: 49, date: "2026-02-24", title: "Refactor: Auth Redirection", text: "Mejoré el sistema de redirecciones para prevenir loops infinitos y asegurar una carga fluida del perfil al iniciar sesión.", tags: ["fix", "performance"] },
  { id: 50, date: "2026-02-24", title: "UI Cleanup: Games", text: "Removí la mascota virtual de la sección de juegos para mejorar la visibilidad y evitar interferencias en móviles.", tags: ["fix", "mobile"] },
  { id: 51, date: "2026-02-24", title: "Features Sociales Completas", text: "Soporte en vivo para likes, contador de seguidores/seguidos, muro público y notificaciones push estelares automáticas por cada interacción.", tags: ["update", "comunidad"] },
  { id: 52, date: "2026-02-24", title: "Estadísticas de la Cabina", text: "La cabina espacial ahora cuenta con un gráfico detallado mostrando cuántos pomodoros has completado los últimos 7 días.", tags: ["update", "productividad"] },
  { id: 53, date: "2026-02-24", title: "Motor Competitivo Estacional", text: "¡Estrenamos temporadas de 21 días! Gana monedas en juegos y cabina para subir en el ranking. Incluye multiplicadores nocturnos, de fin de semana y rush de fase final.", tags: ["update", "gamificación"] },
  { id: 54, date: "2026-02-24", title: "Visualizador de Temporada", text: "Nuevo widget en el leaderboard con tu posición actual, cuenta regresiva, boosts activos y distancia al siguiente nivel competitivo.", tags: ["diseño", "update"] },
  { id: 55, date: "2026-02-24", title: "Optimización Mobile: Juegos", text: "Refactorización completa del motor de escalado en el Games Hub. Los juegos ahora se adaptan dinámicamente al ancho de cualquier pantalla sin cortarse.", tags: ["mobile", "update"] },
  { id: 56, date: "2026-02-24", title: "Dashboard Piloto Renovado", text: "El estatus de piloto ahora incluye rangos evolutivos, tracker de gap competitivo y barra de progreso real para el Daily Cap de Dancoins.", tags: ["update", "diseño"] },
  { id: 57, date: "2026-02-24", title: "Global Feed de Posts", text: "Nueva sección /posts: un feed global estilo blog donde puedes leer y crear transmisiones con título y contenido Markdown completo.", tags: ["update", "comunidad", "blog"] },
  { id: 58, date: "2026-02-24", title: "Editor Markdown con Preview", text: "El composer de posts ahora tiene tabs de Escritura y Preview en tiempo real. Soporta negritas, headers, listas, código, blockquotes y tablas.", tags: ["update", "blog"] },
  { id: 59, date: "2026-02-24", title: "Página de Transmisión", text: "Cada post tiene su propia página /transmission/:id con el artículo completo en Markdown, reacciones, repost y cita directa.", tags: ["update", "blog"] },
  { id: 60, date: "2026-02-24", title: "Edición de Posts en Vivo", text: "Los autores pueden editar sus transmisiones directamente desde la página del post. Los cambios se guardan vía RPC seguro.", tags: ["update", "blog"] },
  { id: 61, date: "2026-02-24", title: "Libro de Visitas Renovado", text: "El guestbook fue completamente rediseñado con el nuevo sistema visual: formulario glassmorphism, toggle animado para modo anónimo y fechas relativas.", tags: ["diseño", "comunidad"] },
  { id: 62, date: "2026-02-24", title: "Type Blitz", text: "Nuevo juego de habilidad: palabras caen desde arriba, tipéalas antes de que toquen la línea de peligro. Sistema de combo, 3 dificultades y récord local.", tags: ["update", "juegos"] },
  { id: 63, date: "2026-02-24", title: "Tron Cycles", text: "Nuevo juego arcade: ciclos de luz al estilo TRON vs IA. Traza tu camino sin chocarte con paredes ni el trail del rival. Flechas, WASD y D-pad táctil.", tags: ["update", "juegos"] },
  { id: 64, date: "2026-02-24", title: "Lights Out", text: "Nuevo puzzle clásico: apaga todas las luces del tablero 5×5. Cada celda que presionas alterna ella y sus 4 vecinas. 3 dificultades y récord por nivel.", tags: ["update", "juegos"] },
  { id: 65, date: "2026-02-24", title: "Visuales Neón en Juegos", text: "Actualizamos los juegos clásicos (Snake, TTT, Memory) con estética premium neón, efectos de resplandor y animaciones fluidas de 60fps.", tags: ["diseño", "juegos"] },
  { id: 66, date: "2026-02-24", title: "IA Invencible: Minimax", text: "Tic-Tac-Toe ahora cuenta con el algoritmo Minimax. En modo 'Pro' la IA es matemáticamente perfecta. ¿Podrás lograr un empate?", tags: ["update", "juegos"] },
  { id: 67, date: "2026-02-24", title: "Sistema de Puntuación Real", text: "Eliminamos los puntajes estáticos. Ahora los puntos escalan con la dificultad, multiplicadores por combo y rachas de victoria.", tags: ["update", "gamificación"] },
];


const PAGE_SIZE = 10;
const ALL_TAGS = [...new Set(bulletinPosts.flatMap(p => p.tags || []))].sort();

const TAG_COLORS = {
  update: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  diseño: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  fix: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  performance: 'text-green-400 bg-green-400/10 border-green-400/20',
  mobile: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  gamificación: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  comunidad: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  blog: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  música: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  interactivo: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  default: 'text-white/40 bg-white/5 border-white/10',
};

function tagColor(tag) {
  return TAG_COLORS[tag] || TAG_COLORS.default;
}

export default function BulletinPage() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const sorted = useMemo(() => [...bulletinPosts].reverse(), []);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q));
    }
    if (activeTag) list = list.filter(p => p.tags?.includes(activeTag));
    return list;
  }, [sorted, search, activeTag]);

  const shown = filtered.slice(0, visible);

  function reset(patch) {
    setVisible(PAGE_SIZE);
    if ('search' in patch) setSearch(patch.search);
    if ('tag' in patch) setActiveTag(patch.tag);
  }

  return (
    <main className="w-full max-w-2xl mx-auto min-h-[100dvh] pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4 relative">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/30 tracking-tight mb-1 uppercase">
          Boletín
        </h1>
        <p className="text-[10px] text-white/25 uppercase tracking-[0.4em] font-black">
          {bulletinPosts.length} entradas · Registro de actualizaciones
        </p>
      </motion.div>

      {/* Buscador */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="relative mb-4"
      >
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="buscar entradas..."
          value={search}
          onChange={e => reset({ search: e.target.value })}
          className="w-full bg-[#0a0a0f] border border-white/[0.06] rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/40 transition-all"
        />
        {search && (
          <button
            onClick={() => reset({ search: '' })}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs"
          >✕</button>
        )}
      </motion.div>

      {/* Tags */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-8"
      >
        {ALL_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => reset({ tag: activeTag === tag ? null : tag })}
            className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${activeTag === tag
              ? tagColor(tag) + ' scale-105'
              : 'text-white/25 bg-white/[0.03] border-white/[0.06] hover:text-white/50'
              }`}
          >
            #{tag}
          </button>
        ))}
      </motion.div>

      {/* Resultado */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#0a0a0f] rounded-[2rem] border border-white/5">
          <span className="text-3xl mb-3 block opacity-30">🛰️</span>
          <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.4em]">Sin resultados</p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="relative flex flex-col gap-0">
            {/* Línea vertical */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/30 via-white/5 to-transparent pointer-events-none" />

            <AnimatePresence initial={false}>
              {shown.map((post, i) => {
                const isNew = i === 0 && !search && !activeTag;
                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                    className="flex gap-5 pb-6 group"
                  >
                    {/* Dot */}
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className={`w-[10px] h-[10px] rounded-full border-2 mt-0.5 transition-all group-hover:scale-125 ${isNew
                        ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                        : 'bg-[#070710] border-white/20 group-hover:border-cyan-500/50'
                        }`} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 bg-[#070710] border border-white/[0.05] rounded-2xl px-4 py-3.5
                                    hover:border-white/10 hover:bg-[#090912] transition-all">
                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[9px] font-mono text-white/20 shrink-0">{post.date}</span>
                        {isNew && (
                          <span className="text-[7px] font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                            nuevo
                          </span>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {post.tags?.map(tag => (
                            <button
                              key={tag}
                              onClick={() => reset({ tag: activeTag === tag ? null : tag })}
                              className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border transition-all hover:scale-105 ${tagColor(tag)}`}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Título */}
                      <p className="text-sm font-black text-white/90 leading-snug mb-1 uppercase tracking-tight">
                        {post.title}
                      </p>

                      {/* Texto */}
                      <p className="text-xs text-white/40 leading-relaxed">
                        {post.text}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Cargar más */}
          {visible < filtered.length && (
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="mt-4 w-full py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-black text-white/30 hover:text-white/60 hover:border-white/15 uppercase tracking-widest transition-all"
            >
              Cargar más antiguas ↓ ({filtered.length - visible} restantes)
            </button>
          )}

          {/* Contador */}
          <p className="text-center text-[9px] font-mono text-white/15 mt-6">
            {Math.min(visible, filtered.length)} / {filtered.length} entradas
          </p>
        </>
      )}
    </main>
  );
}
