import pkg from '@consumet/extensions';
const { ANIME } = pkg;

const GogoProvider = ANIME.Hianime || ANIME.Zoro || ANIME.Gogoanime || ANIME.AnimePahe;
const provider = new GogoProvider();

async function test() {
    console.log('Using provider:', GogoProvider.name);
    try {
        const search = await provider.search('Naruto');
        const results = search.results || search;
        console.log('Search success, results:', results.length);
        
        const animeId = results[0].id;
        console.log('Fetching info for:', animeId);
        
        const fetchFn = provider.fetchAnimeInfo || provider.getAnimeInfo || provider.fetchInfo;
        const info = await fetchFn.call(provider, animeId);
        console.log('Info success, episodes:', info.episodes.length);
        
        const ep1Id = info.episodes[0].id;
        console.log('Fetching sources for:', ep1Id);
        
        const sourceFn = provider.fetchEpisodeSources || provider.getEpisodeSources;
        const sources = await sourceFn.call(provider, ep1Id);
        console.log('Sources success, found:', sources.sources.length);
        if (sources.subtitles) console.log('Subtitles:', sources.subtitles.map(s => s.lang));
        
    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

test();
