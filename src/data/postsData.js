// src/data/postsData.js
export const posts = [
  {
    id: 1,
    title: "Primer post",
    date: "2026-01-09",
    mood: "nostálgica",
    tags: ["personal", "música", "nostalgia"],
    content: `No sé muy bien qué subir aquí.
Siempre tuve la idea de crear un blog y al final decidí materializarla… o bueno, digitalizarla (? xd).

Probablemente actualice esto de vez en cuando, subiendo cositas nuevas y hablando de las cosas que me gustan. Incluso si nadie llega a leerlo, quiero que sea mi espacio seguro, un lugar donde pueda ser yo misma sin pensar demasiado.

Ahora mismo tengo mi playlist favorita de fondo. Una playlist que, siendo sincera, debería actualizar, porque literalmente es la misma música que escucho desde que tenía 16 o 17 años. Pero no sé… creo que está bien si algunas cosas nunca cambian.

Me gusta pensar que, por unos minutos, al escucharla, vuelvo a estar en el auto camino a casa después de un día de escuela. O en la azotea de mi vieja casa, mirando las estrellas, escuchando esas canciones hasta que el frío en la piel me obligaba a bajar.`,
    playlist: {
      gif: "https://media.tenor.com/aj2m5lTme9cAAAAM/darkville-rpg.gif",
      label: "la playlist en cuestión :",
      embed:
        "https://open.spotify.com/embed/playlist/3iOfo1kkl4kh1rk7USWVSA?utm_source=generator",
    },
  },
];

export function getPostById(id) {
  return posts.find((p) => String(p.id) === String(id));
}
