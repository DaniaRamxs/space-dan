import { useState } from 'react';

const GALLERY = [
  {
    id: 1,
    src: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx149544-466pXfETA8oP.jpg',
    alt: 'El chico que me gusta no es un chico — portada',
  },
  {
    id: 7,
    src: 'https://64.media.tumblr.com/32927805ae82a6e4eed78d666964a9d5/20f207f39f07dc01-ec/s2048x3072/0232ea19e05d19edf8bb545607966ba15c2398d7.jpg',
    alt: 'cheesecake de fresa',
  },
  {
    id: 8,
    src: 'https://64.media.tumblr.com/824015010290e5adddf9808e96e8ba7a/tumblr_pq1x7dCLcs1wc13qr_500.jpg',
    alt: 'harry potter libros',
  },
];

export default function GalleryPage() {
  const [lightbox, setLightbox] = useState(null);

  return (
    <main className="card">
      <div className="pageHeader">
        <h1>galería</h1>
        <p className="tinyText">cosas que me gustan 🖼️</p>
      </div>

      <div className="galleryMasonry">
        {GALLERY.map(img => (
          <div
            key={img.id}
            className="galleryItem"
            onClick={() => setLightbox(img)}
          >
            <img src={img.src} alt={img.alt} loading="lazy" />
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="galleryLightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
        >
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="galleryLightboxImg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
