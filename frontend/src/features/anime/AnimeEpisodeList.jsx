import React from 'react';
import { Play } from 'lucide-react';

const AnimeEpisodeList = ({ anime, episodes = [], onSelect, currentEpisodeId }) => {
    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="w-full md:w-64 flex-shrink-0">
                    <img 
                        src={anime.image} 
                        alt={anime.title} 
                        className="w-full rounded-2xl shadow-2xl border border-white/10"
                    />
                </div>
                <div className="flex-1">
                    <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        {anime.title}
                    </h1>
                    <p className="text-white/60 text-lg leading-relaxed mb-6">
                        {anime.description || 'No description available.'}
                    </p>
                    <div className="flex flex-wrap gap-4">
                         {/* Stats could go here */}
                         <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10">
                            <span className="text-purple-400 font-bold">{episodes.length}</span>
                            <span className="text-white/40 ml-2">Episodes</span>
                         </div>
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-purple-600 rounded-full"></span>
                Episodes
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {episodes.map((ep) => (
                    <button
                        key={ep.id}
                        onClick={() => onSelect(ep)}
                        className={`group relative p-4 rounded-xl border transition-all ${
                            currentEpisodeId === ep.id 
                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40' 
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                        }`}
                    >
                        <span className="text-lg font-bold">{ep.number}</span>
                        {currentEpisodeId === ep.id && (
                             <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                <Play size={8} fill="black" stroke="black" />
                             </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AnimeEpisodeList;
