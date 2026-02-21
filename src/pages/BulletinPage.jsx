// src/pages/BulletinPage.jsx
import { useState, useMemo } from 'react';

const bulletinPosts = [
  { id: 1, date: "2026-01-03", title: "Primer boletin", text: "Hola si.", tags: ["general"] },
  { id: 2, date: "2026-01-03", title: "Status", text: "no se que poner aqui xd.", tags: ["general"] },
  { id: 3, date: "2026-01-09", title: "update", text: "actualice el blog y agregue la seccion de post", tags: ["update", "blog"] },
  { id: 4, date: "2026-01-18", title: "posible update", text: "tengo la idea de agregar mis kinnies a la pagina en una seccion donde se vean todos los personajes :3", tags: ["update"] },
  { id: 5, date: "2026-01-18", title: "musica", text: "agregue una seccion de musica en el perfil :3 la ire ampliando", tags: ["update", "música"] },
  { id: 6, date: "2026-01-18", title: "advertencia", text: "agregue una advertencia al ingresar a la pagina por primera vez xd", tags: ["update"] },
  { id: 7, date: "2026-02-17", title: "rediseño visual", text: "rehice todo el diseño visual de la pagina. ahora tiene estética Y2K dark con colores neon magenta y cyan, glassmorphism oscuro y animaciones retro.", tags: ["diseño", "update"] },
  { id: 8, date: "2026-02-17", title: "logo animado", text: "el logo space-dan ahora tiene gradiente animado magenta→cyan y un efecto glitch cada cierto tiempo :3", tags: ["diseño"] },
  { id: 9, date: "2026-02-17", title: "hamburger menu", text: "agregue menu hamburger para mobile. el sidebar ahora se desliza desde la izquierda en pantallas chicas.", tags: ["update", "mobile"] },
  { id: 10, date: "2026-02-17", title: "nav modernizado", text: "los links del nav son ahora glass cards individuales con borde neon al hacer hover.", tags: ["diseño"] },
  { id: 11, date: "2026-02-17", title: "cursor trail", text: "el cursor ahora deja particulas neon magenta y cyan al moverse por la pagina.", tags: ["diseño"] },
  { id: 12, date: "2026-02-17", title: "konami code", text: "agregue un easter egg secreto. pista: ↑↑↓↓←→←→BA :3", tags: ["easter egg"] },
  { id: 13, date: "2026-02-17", title: "contador de visitas", text: "el contador de visitas en el sidebar ahora es real, cuenta visitas de todos los usuarios via counterapi.dev.", tags: ["update"] },
  { id: 14, date: "2026-02-17", title: "fondo de estrellas", text: "reemplace el gif externo del fondo por un campo de estrellas animado propio en canvas. 180 estrellas con parpadeo y estrellas neon ocasionales.", tags: ["diseño"] },
  { id: 15, date: "2026-02-17", title: "seccion de juegos", text: "nueva seccion /juegos con 13 minijuegos: snake, memory, tic tac toe, whack-a-mole, color match, reaction time, 2048, blackjack, sliding puzzle, pong, space invaders, breakout y asteroids.", tags: ["update", "juegos"] },
  { id: 16, date: "2026-02-17", title: "animacion de paginas", text: "cada seccion ahora tiene un fade-in suave al cargar.", tags: ["diseño"] },
  { id: 17, date: "2026-02-17", title: "boletin rediseñado", text: "el boletin ahora tiene diseño de timeline vertical con puntos neon y linea magenta conectando las entradas.", tags: ["diseño", "blog"] },
  { id: 18, date: "2026-02-18", title: "nueva seccion: kinnies", text: "agregue una seccion /kinnies con los personajes con los que mas me identifico: Legoshi, Norman, Isobe y Shizuku Murasaki.", tags: ["update", "kinnies"] },
  { id: 19, date: "2026-02-18", title: "nueva seccion: tests", text: "nueva seccion /tests con 16 cards de tests y arquetipos: MBTI, Eneagrama, Tritype, Hogwarts, Zodiaco, y mas.", tags: ["update"] },
  { id: 20, date: "2026-02-18", title: "nueva seccion: galeria", text: "agregue una galeria /galeria estilo masonry con imagenes de cosas que me gustan. click en cualquier imagen para verla en grande.", tags: ["update"] },
  { id: 21, date: "2026-02-18", title: "nueva seccion: watchlist", text: "nueva seccion /watchlist con todo lo que vi, estoy viendo o planeo ver. incluye filtros por tipo: anime, serie, manga y pelicula.", tags: ["update"] },
  { id: 22, date: "2026-02-21", title: "seccion desktop", text: "nueva experiencia /desktop con ventanas arrastrables, iconos de apps y una barra de tareas estilo windows 9x neon.", tags: ["update", "interactivo"] },
  { id: 23, date: "2026-02-21", title: "seccion dreamscape", text: "explora la oscuridad en /dreamscape. toca las luces para revelar pensamientos y datos curiosos sobre mi :3", tags: ["update", "interactivo"] },
  { id: 24, date: "2026-02-21", title: "seccion time capsule", text: "una boveda temporal bloqueada en /timecapsule con estética hacker y cuenta regresiva. ¿que habra dentro?", tags: ["update", "interactivo"] },
  { id: 25, date: "2026-02-21", title: "mejoras de rendimiento", text: "implemente code-splitting con react lazy/suspense. la pagina ahora carga mucho mas rapido al descargar solo lo necesario.", tags: ["update", "performance"] },
  { id: 26, date: "2026-02-21", title: "responsive total", text: "todas las secciones nuevas ahora son 100% responsivas. el desktop y el dreamscape funcionan perfecto en celulares.", tags: ["update", "mobile"] },
  { id: 27, date: "2026-02-21", title: "limpieza de sitio", text: "elimine la antigua seccion del cuarto para mantener el blog mas limpio y enfocado en las nuevas experiencias.", tags: ["update"] },
  { id: 28, date: "2026-02-21", title: "libro de visitas (guestbook)", text: "¡estrenamos libro de visitas! deja tu firma y un mensaje para la posteridad. seccion creada usando un flujo de trabajo profesional con git branches.", tags: ["update", "git", "comunidad"] },
];

const PAGE_SIZE = 8;

// All unique tags
const ALL_TAGS = [...new Set(bulletinPosts.flatMap((p) => p.tags || []))].sort();

export default function BulletinPage() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const sorted = useMemo(() => [...bulletinPosts].reverse(), []);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.text.toLowerCase().includes(q),
      );
    }
    if (activeTag) {
      list = list.filter((p) => p.tags?.includes(activeTag));
    }
    return list;
  }, [sorted, search, activeTag]);

  const shown = filtered.slice(0, visible);

  function reset(patch) {
    setVisible(PAGE_SIZE);
    if ('search' in patch) setSearch(patch.search);
    if ('tag' in patch) setActiveTag(patch.tag);
  }

  return (
    <main className="card">
      <div className="pageHeader">
        <h1>Boletín</h1>
        <p className="tinyText">{bulletinPosts.length} entradas · posts cortos :3</p>
      </div>

      {/* ── Search ─────────────────────────────────── */}
      <input
        className="searchInput"
        type="text"
        placeholder="buscar entradas..."
        value={search}
        onChange={(e) => reset({ search: e.target.value })}
      />

      {/* ── Tag filters ────────────────────────────── */}
      <div className="tagRow">
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            className={`tagPill${activeTag === tag ? ' active' : ''}`}
            onClick={() => reset({ tag: activeTag === tag ? null : tag })}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* ── Timeline ───────────────────────────────── */}
      <div className="bulletinFeed" style={{ marginTop: 8 }}>
        {shown.length === 0 ? (
          <p className="tinyText">no hay entradas que coincidan :c</p>
        ) : (
          shown.map((post, i) => (
            <article key={post.id} className="bulletinEntry">
              <div className="bulletinLine">
                <div className="bulletinDot" />
              </div>
              <div className="bulletinBody">
                <div className="bulletinMeta">
                  <span className="bulletinDate">{post.date}</span>
                  {i === 0 && filtered.length === bulletinPosts.length && !search && !activeTag && (
                    <span className="bulletinBadge">nuevo</span>
                  )}
                  {post.tags?.map((tag) => (
                    <button
                      key={tag}
                      className={`tagPill bulletinTag${activeTag === tag ? ' active' : ''}`}
                      onClick={() => reset({ tag: activeTag === tag ? null : tag })}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
                <p className="bulletinTitle">{post.title}</p>
                <p className="bulletinText">{post.text}</p>
              </div>
            </article>
          ))
        )}
      </div>

      {/* ── Load more ──────────────────────────────── */}
      {visible < filtered.length && (
        <button
          className="loadMoreBtn"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          cargar más antiguas ↓
        </button>
      )}
    </main>
  );
}
