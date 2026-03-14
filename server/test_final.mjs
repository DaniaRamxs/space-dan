import pkg from '@consumet/extensions';
const { ANIME } = pkg;

// Primary: AnimePahe
const provider = new ANIME.AnimePahe();

async function testFullFlow() {
    console.log('\n--- FULL FLOW TEST: AnimePahe ---\n');
    
    // Step 1: Search
    console.log('1) Searching "Attack on Titan"...');
    const searchResult = await provider.search('Attack on Titan');
    const results = searchResult.results || searchResult || [];
    console.log(`   Found ${results.length} results`);
    
    const anime = results[0];
    console.log(`   Anime ID: ${anime.id} | Title: ${anime.title}`);
    
    // Step 2: Info
    console.log(`\n2) Getting info for: ${anime.id}`);
    const info = await provider.fetchAnimeInfo(anime.id);
    console.log(`   Episodes: ${info.episodes.length}`);
    
    const ep1 = info.episodes[0];
    console.log(`   Ep1 ID: ${ep1.id}`);
    console.log(`   Ep1 has slash: ${ep1.id.includes('/')}`);
    
    // Simulate what Express would do with this ID in the URL
    const parts = ep1.id.split('/');
    console.log(`\n   URL parts: ${parts.length} segments`);
    if (parts.length === 2) {
        console.log(`   → Route would be: /watch/${parts[0]}/${parts[1]}`);
        console.log(`   → Controller reconstructs: ${parts[0]}/${parts[1]}`);
    }
    
    // Step 3: Sources
    console.log(`\n3) Fetching sources for: ${ep1.id}`);
    const sources = await provider.fetchEpisodeSources(ep1.id);
    console.log(`   Sources: ${sources.sources?.length || 0}`);
    if (sources.sources?.length) {
        const first = sources.sources[0];
        console.log(`   First source URL starts with: ${first.url?.substring(0, 60)}`);
        console.log(`   Is M3U8: ${first.isM3U8}`);
        console.log(`   Quality: ${first.quality}`);
        console.log(`   Is Dub: ${first.isDub}`);
    }
    
    console.log('\n✅ Full flow successful!');
    process.exit(0);
}

testFullFlow().catch(e => {
    console.error('❌ Flow failed:', e.message);
    process.exit(1);
});
