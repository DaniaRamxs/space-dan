import { useState } from 'react';

const WATCHLIST = [
  {
    id: 1,
    type: 'manga',
    title: 'Oyasumi Punpun',
    img: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx34632-5xMDkx3pXsEh.png',
    status: 'terminado',
    stars: 4.5,
    review: '',
  },
  {
    id: 2,
    type: 'serie',
    title: 'The Big Bang Theory',
    img: 'https://image.tmdb.org/t/p/w500/euKFiO5M125rpngFRBbSW83beeI.jpg',
    status: 'terminado',
    stars: 4.8,
    review: '',
  },
  {
    id: 3,
    type: 'serie',
    title: 'Arcane',
    img: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    status: 'terminado',
    stars: 4.9,
    review: '',
  },
  {
    id: 4,
    type: 'pelicula',
    title: 'Harry Potter y la Piedra Filosofal',
    img: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 5,
    type: 'pelicula',
    title: 'Harry Potter y la Cámara Secreta',
    img: 'https://image.tmdb.org/t/p/w500/sdEOH0992YZ0QSxgXNIGLq1ToUi.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 6,
    type: 'pelicula',
    title: 'Harry Potter y el Prisionero de Azkaban',
    img: 'https://image.tmdb.org/t/p/w500/aWxwnYoe8p2d2fcxOqtvAtJ72Rw.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 7,
    type: 'pelicula',
    title: 'Harry Potter y el Cáliz de Fuego',
    img: 'https://image.tmdb.org/t/p/w500/fECBtHlr0RB3foNHDiCBXeg9Bv9.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 8,
    type: 'pelicula',
    title: 'Harry Potter y la Orden del Fénix',
    img: 'https://image.tmdb.org/t/p/w500/5aOyriWkPec0zUDxmHFP9qMmBaj.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 9,
    type: 'pelicula',
    title: 'Harry Potter y el Misterio del Príncipe',
    img: 'https://image.tmdb.org/t/p/w500/z7uo9zmQdQwU5ZJHFpv2Upl30i1.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 10,
    type: 'pelicula',
    title: 'Harry Potter y las Reliquias de la Muerte — Parte 1',
    img: 'https://image.tmdb.org/t/p/w500/iGoXIpQb7Pot00EEdwpwPajheZ5.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 11,
    type: 'pelicula',
    title: 'Harry Potter y las Reliquias de la Muerte — Parte 2',
    img: 'https://image.tmdb.org/t/p/w500/c54HpQmuwXjHq2C9wmoACjxoom3.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 12,
    type: 'pelicula',
    title: 'El Señor de los Anillos: La Comunidad del Anillo',
    img: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 13,
    type: 'pelicula',
    title: 'El Señor de los Anillos: Las Dos Torres',
    img: 'https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 14,
    type: 'pelicula',
    title: 'El Señor de los Anillos: El Retorno del Rey',
    img: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 15,
    type: 'pelicula',
    title: 'El Hobbit: Un Viaje Inesperado',
    img: 'https://image.tmdb.org/t/p/w500/yHA9Fc37VmpUA5UncTxxo3rTGVA.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 16,
    type: 'pelicula',
    title: 'El Hobbit: La Desolación de Smaug',
    img: 'https://image.tmdb.org/t/p/w500/xQYiXsheRCDBA39DOrmaw1aSpbk.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 17,
    type: 'pelicula',
    title: 'El Hobbit: La Batalla de los Cinco Ejércitos',
    img: 'https://image.tmdb.org/t/p/w500/xT98tLqatZPQApyRmlPL12LtiWp.jpg',
    status: 'terminado',
    stars: 4.7,
    review: '',
  },
  {
    id: 18,
    type: 'anime',
    title: 'The Promised Neverland',
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-8UR7r9MNVpz2.jpg',
    status: 'terminado',
    stars: 4.3,
    review: '',
  },
  {
    id: 19,
    type: 'anime',
    title: 'Sword Art Online',
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11757-SxYDUzdr9rh2.jpg',
    status: 'terminado',
    stars: 4,
    review: '',
  },
];

const FILTERS = ['todos', 'anime', 'serie', 'manga', 'pelicula'];

function Stars({ n }) {
  if (n === 0) return null;
  return <span className="watchStars">★ {n}</span>;
}

export default function WatchlistPage() {
  const [filter, setFilter] = useState('todos');

  const visible = filter === 'todos'
    ? WATCHLIST
    : WATCHLIST.filter(w => w.type === filter);

  return (
    <main className="card">
      <div className="pageHeader">
        <h1>watchlist</h1>
        <p className="tinyText">lo que veo, vi y planeo ver 📺</p>
      </div>

      <div className="watchFilters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`watchFilterBtn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="watchGrid">
        {visible.map(w => (
          <div key={w.id} className="watchCard">
            <img
              src={w.img}
              alt={w.title}
              className="watchCover"
              onError={e => {
                e.currentTarget.style.background = 'rgba(255,0,255,0.08)';
              }}
            />
            <div className="watchInfo">
              <p className="watchTitle">{w.title}</p>
              <span className={`watchBadge ${w.status}`}>{w.status}</span>
              <Stars n={w.stars} />
              {w.review && <p className="watchReview">{w.review}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
