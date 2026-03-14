import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { animeService } from './animeService';

const AnimeSearch = ({ onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const data = await animeService.searchAnime(query);
            setResults(data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <form onSubmit={handleSearch} className="relative mb-8">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for an anime (e.g. Naruto, One Piece...)"
                    className="w-full py-4 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg backdrop-blur-xl"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={24} />
                <button 
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
                </button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.map((anime) => (
                    <div 
                        key={anime.id}
                        onClick={() => onSelect(anime)}
                        className="group cursor-pointer bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all hover:-translate-y-1 shadow-lg"
                    >
                        <div className="relative aspect-[3/4] overflow-hidden">
                            <img 
                                src={anime.image} 
                                alt={anime.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-3">
                            <p className="text-white font-semibold text-sm line-clamp-2 leading-tight group-hover:text-purple-400 transition-colors">
                                {anime.title}
                            </p>
                            {anime.releaseDate && (
                                <p className="text-white/40 text-[10px] mt-1 uppercase tracking-wider">{anime.releaseDate}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {results.length === 0 && !loading && query && (
                <div className="text-center py-20">
                    <p className="text-white/40 text-lg">No results found for "{query}"</p>
                </div>
            )}
        </div>
    );
};

export default AnimeSearch;
