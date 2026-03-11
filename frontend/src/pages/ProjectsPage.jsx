// src/pages/ProjectsPage.jsx
import { ExternalLink, Github, Star, GitFork } from 'lucide-react';
import GitHubStats from '../components/GitHubStats';

const PROJECTS = [
  {
    id: 'space-dan',
    name: 'space-dan',
    description:
      'Portafolio personal interactivo con estética Y2K/cyberpunk. Incluye 23 minijuegos, blog, guestbook en tiempo real con Supabase, OS desktop interactivo y reproductor de música con visualizador Web Audio API.',
    tech: ['React 19', 'Vite 7', 'Tailwind CSS', 'Supabase', 'Web Audio API', 'React Router 7', 'Canvas API'],
    github: 'https://github.com/DaniaRamxs/space-dan',
    demo: null,
    status: 'en desarrollo',
    statusColor: '#39ff14',
    featured: true,
    highlights: [
      '23 juegos implementados desde cero con Canvas',
      'Guestbook con Supabase real-time subscriptions',
      'Web Audio API visualizer con AnalyserNode',
      'OS Desktop interactivo con ventanas arrastrables',
      'Code splitting + lazy loading para cada página',
    ],
  },
  {
    id: 'mini-games-engine',
    name: 'mini-games-engine',
    description:
      'Motor de juegos en 2D basado en Canvas para juegos arcade clásicos. Implementa física básica, detección de colisiones AABB, sistema de puntuaciones y loop de juego con requestAnimationFrame.',
    tech: ['JavaScript', 'Canvas API', 'HTML5', 'CSS3'],
    github: 'https://github.com/DaniaRamxs',
    demo: null,
    status: 'completado',
    statusColor: '#00e5ff',
    featured: false,
    highlights: [
      'Loop de juego con requestAnimationFrame',
      'Detección de colisiones AABB y círculo',
      'Sistema de high scores con LocalStorage',
    ],
  },
  {
    id: 'react-ui-components',
    name: 'componentes UI',
    description:
      'Librería de componentes reutilizables con diseño consistente. Incluye inputs, modals, players, calendarios y más. Construida con CSS custom properties para theming dinámico.',
    tech: ['React', 'CSS Custom Properties', 'Lucide React', 'Vite'],
    github: 'https://github.com/DaniaRamxs',
    demo: null,
    status: 'en desarrollo',
    statusColor: '#39ff14',
    featured: false,
    highlights: [
      'Theming con CSS custom properties',
      'Componentes accesibles con ARIA',
      'Zero dependencias externas de UI',
    ],
  },
];

function StatusBadge({ label, color }) {
  return (
    <span
      className="projectStatusBadge"
      style={{ '--badge-color': color }}
    >
      <span className="projectStatusDot" />
      {label}
    </span>
  );
}

function TechChip({ label }) {
  return <span className="projectTechChip">{label}</span>;
}

function ProjectCard({ project }) {
  return (
    <article className={`projectCard${project.featured ? ' featured' : ''}`}>
      <div className="projectCardHeader">
        <div className="projectCardTitle">{project.name}</div>
        <StatusBadge label={project.status} color={project.statusColor} />
      </div>

      <p className="projectCardDesc">{project.description}</p>

      {project.featured && project.highlights.length > 0 && (
        <ul className="projectHighlights">
          {project.highlights.map(h => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}

      <div className="projectTechList">
        {project.tech.map(t => <TechChip key={t} label={t} />)}
      </div>

      <div className="projectCardLinks">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="projectLink"
          >
            <Github size={14} />
            GitHub
          </a>
        )}
        {project.demo && (
          <a
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="projectLink projectLinkDemo"
          >
            <ExternalLink size={14} />
            Demo
          </a>
        )}
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  return (
    <main className="card">
      <div className="pageHeader">
        <h1 style={{ margin: 0 }}>💻 Proyectos</h1>
        <p className="tinyText">cosas que he construido</p>
      </div>

      {/* GitHub Stats */}
      <GitHubStats username="DaniaRamxs" />

      {/* Projects grid */}
      <section>
        <div className="sectionLabel">proyectos destacados</div>
        <div className="projectsGrid">
          {PROJECTS.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      </section>
    </main>
  );
}
