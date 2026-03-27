import { Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">SPACELY</h1>
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
      </div>
      <p className="text-cyan-400 text-xs sm:text-sm font-medium tracking-wide">
        TU UNIVERSO, A TU MANERA.
      </p>
    </header>
  );
}