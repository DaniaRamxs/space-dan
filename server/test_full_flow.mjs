import pkg from '@consumet/extensions';
const { ANIME } = pkg;

async function testProvider(ProviderClass, providerName) {
    console.log(`\n\n${'='.repeat(50)}`);
    console.log(`TESTING: ${providerName}`);
    console.log('='.repeat(50));
    
    const provider = new ProviderClass();
    
    try {
        // 1. Search
        console.log('\n[1] Searching "Naruto"...');
        const searchResult = await provider.search('Naruto');
        const results = searchResult.results || searchResult || [];
        console.log(`Found ${results.length} results`);
        if (!results.length) { console.warn('No results!'); return; }
        
        const first = results[0];
        console.log('First result:', JSON.stringify({ id: first.id, title: first.title, type: first.type }, null, 2));
        
        // 2. Get anime info
        console.log(`\n[2] Getting info for ID: ${first.id}...`);
        const fetchInfoFn = provider.fetchAnimeInfo || provider.getAnimeInfo;
        if (!fetchInfoFn) { console.warn('No fetchAnimeInfo fn!'); return; }
        
        const info = await fetchInfoFn.call(provider, first.id);
        console.log(`Episodes: ${info.episodes?.length || 0}`);
        if (!info.episodes?.length) { console.warn('No episodes!'); return; }
        
        const ep1 = info.episodes[0];
        console.log('Episode 1 data:', JSON.stringify(ep1, null, 2));
        
        // 3. Get sources
        console.log(`\n[3] Getting sources for episode ID: ${ep1.id}...`);
        const fetchSourcesFn = provider.fetchEpisodeSources || provider.getEpisodeSources;
        if (!fetchSourcesFn) { console.warn('No fetchEpisodeSources fn!'); return; }
        
        const sources = await fetchSourcesFn.call(provider, ep1.id);
        console.log(`Sources found: ${sources.sources?.length || 0}`);
        if (sources.sources?.length) {
            console.log('First source:', JSON.stringify(sources.sources[0], null, 2));
        }
        if (sources.subtitles?.length) {
            console.log('Subtitle langs:', sources.subtitles.map(s => s.lang));
        }
        
    } catch (e) {
        console.error(`ERROR in ${providerName}:`, e.message);
    }
}

// Test Hianime first (priority)
await testProvider(ANIME.Hianime, 'Hianime');

// Test AnimePahe as fallback
await testProvider(ANIME.AnimePahe, 'AnimePahe');

process.exit(0);
