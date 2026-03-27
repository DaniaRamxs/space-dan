import { Header } from './components/Header';
import { CreateSpaceButton } from './components/CreateSpaceButton';
import { SpaceCard } from './components/SpaceCard';
import { BottomNav } from './components/BottomNav';
import { Tv, BookOpen, Palette, Gamepad2, Crown, Dice5 } from 'lucide-react';

const spaces = [
  {
    icon: Tv,
    title: 'Anime',
    subtitle: 'Watch party',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: BookOpen,
    title: 'Manga',
    subtitle: 'Lectura grupal',
    gradient: 'linear-gradient(135deg, #2d1b3d 0%, #4a2c5a 50%, #6b3d7d 100%)',
    iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    icon: Palette,
    title: 'Pixel Galaxy',
    subtitle: 'Arte colaborativo',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #1a3a2e 50%, #2c5f2d 100%)',
    iconBg: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
  },
  {
    icon: Gamepad2,
    title: 'Connect 4',
    subtitle: 'Duelo 1v1',
    gradient: 'linear-gradient(135deg, #2d1810 0%, #4a2c1a 50%, #6b4423 100%)',
    iconBg: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
  },
  {
    icon: Crown,
    title: 'Ajedrez',
    subtitle: 'Partidas rápidas',
    gradient: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 50%, #3c3c54 100%)',
    iconBg: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
  },
  {
    icon: Dice5,
    title: 'Poker',
    subtitle: 'Mesa privada',
    gradient: 'linear-gradient(135deg, #2d1810 0%, #4a1a1a 50%, #6b2323 100%)',
    iconBg: 'linear-gradient(135deg, #ff7675 0%, #d63031 100%)',
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black pb-20 sm:pb-24">
      <div className="max-w-2xl mx-auto">
        <Header />
        
        <div className="px-4 sm:px-6 mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-500/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wide">ESPACIOS</span>
          </div>
          
          <h2 className="text-white text-3xl sm:text-4xl font-bold mt-3 sm:mt-4 mb-1 sm:mb-2">ESPACIOS</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Entra directo, habla cuando quieras.</p>
        </div>

        <CreateSpaceButton />

        <div className="px-4 sm:px-6 grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {spaces.map((space) => (
            <SpaceCard key={space.title} {...space} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}