/**
 * Finds which anime providers serve streams that are
 * actually accessible from a server (not blocked by Cloudflare/CDN).
 */
import pkg from '@consumet/extensions';
const { ANIME } = pkg;

const CDN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://animepahe.ru/',
  'Origin': 'https://animepahe.ru',
  'Accept': '*/*',
};

async function testProvider(name, ProviderClass) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`TESTING: ${name}`);
  try {
    const provider = new ProviderClass();
    const search = await provider.search('Naruto');
    const results = search.results || search || [];
    if (!results.length) { console.log('   ❌ No search results'); return null; }

    const anime = results[0];
    console.log(`   Search OK: ${anime.title} (ID: ${anime.id?.substring(0,20)}...)`);

    const fetchInfoFn = provider.fetchAnimeInfo || provider.getAnimeInfo;
    if (!fetchInfoFn) { console.log('   ❌ No fetchAnimeInfo'); return null; }

    const info = await fetchInfoFn.call(provider, anime.id);
    if (!info?.episodes?.length) { console.log('   ❌ No episodes'); return null; }

    const ep = info.episodes[0];
    const fetchSrcFn = provider.fetchEpisodeSources || provider.getEpisodeSources;
    if (!fetchSrcFn) { console.log('   ❌ No fetchEpisodeSources'); return null; }

    const sources = await fetchSrcFn.call(provider, ep.id);
    if (!sources?.sources?.length) { console.log('   ❌ No sources'); return null; }

    const src = sources.sources[0];
    console.log(`   Source URL: ${src.url?.substring(0, 70)}...`);
    console.log(`   Quality: ${src.quality} | isM3U8: ${src.isM3U8}`);

    // Test if CDN is reachable from this server
    const cdnResponse = await fetch(src.url, { 
      headers: { ...CDN_HEADERS, Referer: `https://${name.toLowerCase()}.com/` }
    });
    console.log(`   CDN Status: ${cdnResponse.status} ${cdnResponse.status === 200 ? '✅ ACCESSIBLE' : '❌ BLOCKED'}`);

    if (cdnResponse.ok) {
      return { name, src: src.url, episodeId: ep.id, quality: src.quality };
    }
    return null;

  } catch (e) {
    console.log(`   ❌ Error: ${e.message?.substring(0, 100)}`);
    return null;
  }
}

const providers = Object.entries(ANIME);
console.log(`Available providers: ${providers.map(([k]) => k).join(', ')}\n`);

const working = [];
for (const [name, ProviderClass] of providers) {
  try {
    const result = await testProvider(name, ProviderClass);
    if (result) working.push(result);
  } catch (e) {
    console.log(`   CRITICAL ERROR in ${name}:`, e.message?.substring(0, 80));
  }
}

console.log(`\n${'═'.repeat(50)}`);
console.log('PROVIDERS WITH ACCESSIBLE CDN:');
if (working.length === 0) {
  console.log('❌ None — all CDNs are blocked from this server');
  console.log('💡 Suggestion: Use iframe embed approach instead of direct HLS');
} else {
  working.forEach(p => console.log(`  ✅ ${p.name} - ${p.quality}`));
}
process.exit(0);
