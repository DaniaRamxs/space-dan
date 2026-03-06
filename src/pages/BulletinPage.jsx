import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownGuide from '../components/Social/MarkdownGuide';
import LevelGuide from '../components/Social/LevelGuide';
import ApkDownload from '../components/ApkDownload';

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
  { id: 30, date: "2026-02-21", title: "Sistema Starlys", text: "Implementé un sistema de monedas propio: gana Starlys visitando páginas, jugando minijuegos y reclamando el bonus diario.", tags: ["update", "gamificación"] },
  { id: 31, date: "2026-02-21", title: "16 logros desbloqueables", text: "Sistema de achievements: 16 logros que se desbloquean explorando el sitio, jugando, visitando a distintas horas o encontrando secretos. Cada logro otorga Starlys.", tags: ["update", "gamificación"] },
  { id: 32, date: "2026-02-21", title: "Tienda (TIENDA.exe)", text: "Nueva tienda /tienda: gasta Starlys en personalización. Cursores con trail de colores, screensavers, temas de fondo estelar y estaciones de radio extra.", tags: ["update", "gamificación"] },
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
  { id: 45, date: "2026-02-21", title: "4 nuevos logros del OS", text: "Nuevos achievements del escritorio: Usuario del OS, Hacker, Multitarea y Dev Mode. Cada uno otorga Starlys.", tags: ["update", "gamificación"] },
  { id: 46, date: "2026-02-23", title: "PWA & Cache Cleanup", text: "Implementé Service Workers con PWA. El sitio ahora funciona offline y limpia automáticamente archivos viejos en cada despliegue.", tags: ["update", "performance"] },
  { id: 47, date: "2026-02-24", title: "Identidad Profesional", text: "Sistema de identidad renovado: ahora puedes elegir tu @username único. Los nombres son case-insensitive y tienen un cooldown de 30 días para fomentar la estabilidad.", tags: ["update", "identidad"] },
  { id: 48, date: "2026-02-24", title: "Login Multi-Provider", text: "Soporte completo para Google y Discord con vinculación de perfiles. Tu identidad en Spacely es independiente del proveedor de login.", tags: ["update", "seguridad"] },
  { id: 49, date: "2026-02-24", title: "Refactor: Auth Redirection", text: "Mejoré el sistema de redirecciones para prevenir loops infinitos y asegurar una carga fluida del perfil al iniciar sesión.", tags: ["fix", "performance"] },
  { id: 50, date: "2026-02-24", title: "UI Cleanup: Games", text: "Removí la mascota virtual de la sección de juegos para mejorar la visibilidad y evitar interferencias en móviles.", tags: ["fix", "mobile"] },
  { id: 51, date: "2026-02-24", title: "Features Sociales Completas", text: "Soporte en vivo para likes, contador de seguidores/seguidos, muro público y notificaciones push estelares automáticas por cada interacción.", tags: ["update", "comunidad"] },
  { id: 52, date: "2026-02-24", title: "Estadísticas de la Cabina", text: "La cabina espacial ahora cuenta con un gráfico detallado mostrando cuántos pomodoros has completado los últimos 7 días.", tags: ["update", "productividad"] },
  { id: 53, date: "2026-02-24", title: "Motor Competitivo Estacional", text: "¡Estrenamos temporadas de 21 días! Gana monedas en juegos y cabina para subir en el ranking. Incluye multiplicadores nocturnos, de fin de semana y rush de fase final.", tags: ["update", "gamificación"] },
  { id: 54, date: "2026-02-24", title: "Visualizador de Temporada", text: "Nuevo widget en el leaderboard con tu posición actual, cuenta regresiva, boosts activos y distancia al siguiente nivel competitivo.", tags: ["diseño", "update"] },
  { id: 55, date: "2026-02-24", title: "Optimización Mobile: Juegos", text: "Refactorización completa del motor de escalado en el Games Hub. Los juegos ahora se adaptan dinámicamente al ancho de cualquier pantalla sin cortarse.", tags: ["mobile", "update"] },
  { id: 56, date: "2026-02-24", title: "Dashboard Piloto Renovado", text: "El estatus de piloto ahora incluye rangos evolutivos, tracker de gap competitivo y barra de progreso real para el Daily Cap de Starlys.", tags: ["update", "diseño"] },
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
  { id: 75, date: "2026-02-25", title: "App Android Oficial", text: "¡Lanzamiento de la APK de Spacely! Ahora puedes instalar la app directamente en tu Android para una experiencia 100% fluida.", tags: ["update", "mobile"] },
  { id: 76, date: "2026-02-25", title: "Auth Móvil & Deep Links", text: "Implementamos autenticación nativa con Capacitor. El login de Google y Discord ahora abre el navegador del sistema y vuelve a la app automáticamente manteniendo tu sesión.", tags: ["update", "seguridad", "mobile"] },
  { id: 77, date: "2026-02-26", title: "Persistencia de Radio", text: "Corregido un fallo donde tus radios compradas no se equipaban al recargar. Ahora tu playlist estelar es persistente en cualquier dispositivo.", tags: ["fix", "música"] },
  { id: 78, date: "2026-02-26", title: "Navegación Simplificada", text: "Eliminamos la página de bienvenida para un acceso más directo. El feed global de /posts es ahora la nueva entrada principal al universo.", tags: ["update", "diseño"] },
  { id: 79, date: "2026-02-26", title: "Estabilidad de Tienda", text: "Arreglamos los botones de compra que fallaban ocasionalmente. También mejoramos el soporte para compras de usuarios visitantes.", tags: ["fix", "gamificación"] },
  { id: 80, date: "2026-02-27", title: "Protocolo de Estabilidad de Perfiles", text: "Corregido crash crítico al visitar perfiles con nombres compuestos (espacios). Además, se solventaron errores de referencia en el sistema de Vínculos Estelares que impedían la sincronización entre pilotos.", tags: ["fix", "identidad"] },
  { id: 81, date: "2026-02-27", title: "Chat Global: Persistencia VIP", text: "Los mensajes destacados (VIP) ahora son sticky. Se quedan clavados en la parte superior de la pantalla incluso si scrolleas hacia abajo, asegurando que las transmisiones prioritarias nunca se pierdan.", tags: ["update", "comunidad"] },
  { id: 82, date: "2026-02-27", title: "Giphy en el Feed", text: "Expandimos el soporte de GIFs a las publicaciones del feed de actividad. Ahora puedes buscar y añadir GIFs de Giphy directamente desde el Post Composer.", tags: ["update", "blog"] },
  { id: 83, date: "2026-02-27", title: "Chat de Pantalla Completa", text: "Aumentamos el ancho de las burbujas de chat al 95%. Las palabras largas y URLs ya no se cortan, y el texto tiene mucho más aire para respirar.", tags: ["diseño", "update"] },
  { id: 84, date: "2026-02-27", title: "AI Biometrics & Arquitectura", text: "Actualización masiva de la página de Arquitectura para documentar el uso de MediaPipe (IA) en la cabina, Supabase Realtime y el nuevo stack de sincronización social.", tags: ["update", "tecnología"] },
  { id: 85, date: "2026-02-27", title: "Limpieza de Cabina", text: "Optimizamos el HUD de la cabina espacial eliminando la radio duplicada. Ahora el sistema usa la radio global del OS para una experiencia sonora fluida.", tags: ["fix", "diseño"] },
  { id: 86, date: "2026-02-27", title: "Refinamiento de Embeds", text: "Mejoramos la lógica de los posts compartidos (reposts/citas). Ahora el cuadro de la publicación original solo se muestra si contiene datos válidos, evitando mensajes de error como 'vacio temporal'.", tags: ["fix", "social"] },
  { id: 87, date: "2026-02-27", title: "Visitas en el Feed", text: "Integramos el contador de visitas global directamente en el feed de actividad (LivenessSignals). Para mantener la interfaz limpia, lo eliminamos de la barra superior y el menú móvil.", tags: ["update", "diseño"] },
  { id: 88, date: "2026-02-27", title: "Protocolo de Voz (MVP)", text: "¡Lanzamiento de las salas de audio! Sintoniza canales de voz premium de hasta 5 personas con cancelación de eco, supresión de ruido e indicador visual de quién está hablando.", tags: ["update", "tecnología"] },
  { id: 89, date: "2026-03-01", title: "Icono APK personalizado", text: "La app de Android ya tiene icono propio: fondo azul oscuro profundo (#050520) con las letras SPACE DAN en neón fucsia. Incluye versión adaptativa con capa de foreground y splash screen a todas las densidades.", tags: ["diseño", "mobile"] },
  { id: 90, date: "2026-03-01", title: "Voz en segundo plano (APK)", text: "Las salas de voz ahora corren como servicio foreground en Android. Al minimizar la app el micrófono sigue activo, aparece una notificación con la sala activa y el sistema no puede matarlo.", tags: ["update", "mobile", "tecnología"] },
  { id: 91, date: "2026-03-01", title: "Fixes de APK varios", text: "Tres correcciones en la app nativa: el teclado ya no tapa los inputs de /cartas, el botón físico de volver cierra la conversación activa en lugar de salir de la página, y se eliminó el autoFocus que abría el teclado solo al entrar.", tags: ["fix", "mobile"] },
  { id: 92, date: "2026-03-01", title: "Fix: @menciones sin notificación", text: "Las menciones en el chat global no generaban notificación por un doble bug: el tipo 'mention' no estaba en la restricción de la base de datos, y la política RLS bloqueaba inserciones cruzadas entre usuarios. Resuelto con una función SECURITY DEFINER y el constraint ampliado.", tags: ["fix", "comunidad"] },
  { id: 93, date: "2026-03-01", title: "Radio en segundo plano (APK)", text: "La radio ahora corre como servicio foreground de tipo mediaPlayback en Android. Al minimizar la app el streaming continúa sin interrupciones, con un WifiLock para mantener la conexión activa y una notificación que muestra la estación y el género en reproducción.", tags: ["update", "mobile", "música"] },
  { id: 94, date: "2026-03-01", title: "Fix: Relaciones de Bitácora", text: "Corregido error 400 (Bad Request) al intentar cargar artículos de bitácora desde perfiles externos. Se optimizó el motor de consulta para ser resiliente a la falta de claves foráneas explícitas.", tags: ["fix", "blog"] },
  { id: 95, date: "2026-03-01", title: "Sincronización de Identidad", text: "Establecidas nuevas restricciones de integridad en Supabase para asegurar que temas y bloques de perfil se mantengan sincronizados con la identidad del piloto.", tags: ["update", "identidad"] },
  { id: 96, date: "2026-03-01", title: "Rebrand: Dancoins → Starlys", text: "El sistema de monedas se renombró completamente a 'Starlys'. Se migró el hook, las clases CSS, todos los textos del sitio y la lógica de guest fallback.", tags: ["update", "gamificación"] },
  { id: 97, date: "2026-03-01", title: "CursorTrail con Canvas", text: "El trail del cursor fue refactorizado de nodos DOM individuales a un único Canvas con RAF loop. Mucho más eficiente. Se desactiva automáticamente en pantallas táctiles.", tags: ["diseño", "performance"] },
  { id: 98, date: "2026-03-01", title: "Nuevas paletas de cursor", text: "Seis nuevas paletas comprables para el trail del cursor: Cyan, Verde Neón, Dorado, Arcoíris, Rosa y Blanco. Comprables en la tienda con Starlys.", tags: ["diseño", "gamificación"] },
  { id: 99, date: "2026-03-01", title: "Cursor SVG nativo", text: "El cursor ya no depende de una imagen PNG externa. Ahora usa un SVG inline: flecha neon cyan para el cursor normal y crosshair neon para botones. Carga instantánea.", tags: ["diseño", "performance"] },
  { id: 100, date: "2026-03-01", title: "Banner de Perfil", text: "Ahora puedes subir una imagen de cabecera a tu perfil directamente desde el editor de temas. Soporta cualquier imagen hasta 5MB y se guarda en el bucket de avatares.", tags: ["update", "diseño"] },
  { id: 101, date: "2026-03-01", title: "Color de Fondo del Perfil", text: "El editor de perfil tiene un nuevo selector de color para personalizar el fondo de tu página. Palette RGB completa.", tags: ["diseño", "update"] },
  { id: 102, date: "2026-03-01", title: "VoiceRoom integrado con Android", text: "Las salas de voz ahora invocan el plugin nativo de Android al conectarse y desconectarse. El servicio de voz en segundo plano arranca y se detiene en sincronía con la sala.", tags: ["update", "mobile", "tecnología"] },
  { id: 103, date: "2026-03-01", title: "Spotify: Fix de configuración", text: "Conectar Spotify desde el perfil ahora muestra un mensaje de error claro si falta la variable de entorno VITE_SPOTIFY_CLIENT_ID, en lugar de fallar silenciosamente.", tags: ["fix", "música"] },
  { id: 104, date: "2026-03-01", title: "Shop: guest mode mejorado", text: "La tienda ahora usa useStarlys como fallback para visitantes sin sesión. Los usuarios no logueados pueden gastar su balance local y reclamar el bonus diario.", tags: ["update", "gamificación"] },
  { id: 105, date: "2026-03-02", title: "Operación: Blindaje Estelar 🛡️", text: "Implementamos una actualización masiva de seguridad. Tu economía, perfil y mensajes ahora están respaldados por nuevas políticas de privacidad incorruptibles. Hemos fortalecido el núcleo de nuestra base de datos para prevenir spam, manipulación de Starlys y asegurar que solo tú tengas el mando de tus propios datos dentro de Spacely.", tags: ["update", "seguridad", "tecnología"] },
  { id: 106, date: "2026-03-02", title: "Refinería de Identidad 🚀", text: "Corregimos un error crítico en el proceso de bienvenida que causaba bucles de redirección al registrarse. Ahora la creación de identidad está unificada, asegurando que todos los nuevos exploradores pasen por el onboarding correctamente y sus fotos de perfil se carguen al instante sin errores.", tags: ["fix", "identidad", "performance"] },
  { id: 107, date: "2026-03-02", title: "Radar Emocional API v1.2 🎧", text: "El perfil de usuario estrena HUD de Radar Emocional v1.2. Ahora la compatibilidad y afinidad estelar se calculan usando el historial sonoro de los últimos 3 días. Además, si están sintonizando audio ahora mismo o tienen un puente musical reciente, lo verás reflejado con estilo HUD animado.", tags: ["update", "música", "diseño"] },
  { id: 108, date: "2026-03-04", title: "Sistema de Niveles: Rayo y Llama ⚡🔥", text: "Estrenamos dos nuevos indicadores visuales en el chat: el Rayo Azul (Poder Estelar Total) y la Llama Morada (Actividad Social en Vivo). ¡Consulta la nueva sección de información para saber cómo subirlos!", tags: ["update", "gamificación"] },
  { id: 109, date: "2026-03-04", title: "Prestige y Títulos Reales ✦👑", text: "Llegó el sistema de Prestigio: resetea tu nivel 10 para ganar estrellas permanentes. Además, equipa títulos como 'Comandante' o 'Nebulosa' usando /title en el chat.", tags: ["update", "gamificación"] },
  { id: 110, date: "2026-03-04", title: "Mapa Estelar Mobile-First 🌌📱", text: "Refactorización completa del mapa: ahora puedes arrastrar, hacer zoom y usar agujeros de gusano desde tu celular. Incluye la nueva estación espacial 'Hall of Fame'.", tags: ["update", "mobile", "diseño"] },
  { id: 111, date: "2026-03-04", title: "The Dark Side & XP Boosts ⚡🌑", text: "Nuevo modo nocturno automático (12AM-5AM) con bonificación de x1.5 coins. También estrenamos /xp-boost para duplicar toda tu XP de actividad durante una hora.", tags: ["update", "gamificación", "diseño"] },
  { id: 112, date: "2026-03-04", title: "Optimización de Sincronización 🛡️", text: "Solucionadas condiciones de carrera en la asignación de misiones y redundancia en el sistema de economía para asegurar una experiencia sin errores.", tags: ["fix", "tecnología"] },
  { id: 113, date: "2026-03-04", title: "HyperBot 3.0: Economía & Destellos 🌌🚀", text: "Llegó la actualización definitiva: Seguros Estelares contra robos, Inversiones con retorno variable, Efectos de Chat (Fuego, Estrellas, Glitch), Badge Color Designer, Calendario de Actividad con Rachas y un nuevo Onboarding guiado para reclutas. ¡El Eclipse Galáctico (x3 rewards) ya es una realidad!", tags: ["update", "gamificación", "economía"] },
  { id: 114, date: "2026-03-04", title: "Juegos de Redención 💀🌌", text: "Nueva mecánica secreta para pilotos en crisis. Si tienes deuda acumulada, podrías recibir una invitación al vacío. Supera tres pruebas mortales para borrar tu pasado financiero... al costo de todo tu balance actual.", tags: ["update", "juegos", "economía"] },
  { id: 115, date: "2026-03-04", title: "Grandes Casas Estelares 👑💎", text: "La liga de magnates ha llegado. Si tu fortuna supera los 50M de Starlys, podrás unirte a la elite financiera. Accede a inversiones de gran escala, influye en la economía global y protégete (o sufre) las auditorías del Banco Estelar.", tags: ["update", "economía", "interactivo"] },
  { id: 116, date: "2026-03-04", title: "Protocolo de Auditoría e Impuestos 🛡️", text: "Implementamos el Impuesto Magnate (2%) para movimientos de gran volumen y el sistema de Auditorías Bancarias. Además, los magnates ahora tienen límites de transferencia ultra-extendidos de hasta 50M ◈.", tags: ["update", "seguridad", "economía"] },
  { id: 117, date: "2026-03-05", title: "Rediseño de Economía de Tienda 📉📈", text: "Reescalamos todos los precios de la Tienda de Spacely para adaptarnos a los estándares actuales de Starlys. Los ítems cosméticos ahora siguen una progresión de precio justa, desde básicos en decenas de miles hasta míticos por 15 Millones. También ajustamos los retornos de reciclaje de cofres para asegurar que seguir probando suerte (Gacha) sea rentable incluso si te tocan artículos repetidos.", tags: ["update", "economía", "gamificación"] },
  { id: 118, date: "2026-03-05", title: "Fix: Errores Visuales en Colección", text: "Se resolvió el error 400 Bad Request que aparecía en la sección de 'Colección' de los perfiles públicos. La incongruencia de atributos en la base de datos se depuró para una respuesta ágil y limpia del servidor.", tags: ["fix", "performance"] },
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
  const [showGuide, setShowGuide] = useState(false);
  const [showLevelGuide, setShowLevelGuide] = useState(false);

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
    <main className="w-full max-w-2xl mx-auto min-h-screen pb-64 text-white font-sans flex flex-col pt-6 md:pt-10 px-0 md:px-4 relative overflow-y-auto">

      {/* Header - Now visible on mobile */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 px-4 md:px-0 flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/30 tracking-tight mb-1 uppercase text-center md:text-left">
            Boletín
          </h1>
          <p className="text-[8px] md:text-[10px] text-white/25 uppercase tracking-[0.4em] font-black text-center md:text-left">
            {bulletinPosts.length} entradas · Registro de actualizaciones
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowGuide(true)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/5 group text-center"
          >
            <span className="group-hover:animate-pulse">✨ Guía de Energía Estelar</span>
          </button>
          <button
            onClick={() => setShowLevelGuide(true)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-violet-400 hover:bg-violet-400/10 hover:border-violet-400/30 transition-all shadow-lg shadow-violet-500/5 group text-center"
          >
            <span className="group-hover:animate-pulse">📊 Info Rango y Actividad</span>
          </button>
        </div>
      </motion.div>

      <div className="px-4 md:px-0 mb-8">
        <ApkDownload />
      </div>


      <AnimatePresence>
        {showGuide && <MarkdownGuide onClose={() => setShowGuide(false)} />}
        {showLevelGuide && <LevelGuide onClose={() => setShowLevelGuide(false)} />}
      </AnimatePresence>

      {/* Buscador */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="relative mb-4 px-4 md:px-0"
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
        className="flex flex-wrap gap-2 mb-8 px-4 md:px-0"
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
        <div className="mx-4 text-center py-16 bg-[#0a0a0f] rounded-[2rem] border border-white/5">
          <span className="text-3xl mb-3 block opacity-30">🛰️</span>
          <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.4em]">Sin resultados</p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="relative flex flex-col gap-0 px-4 md:px-0">
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
