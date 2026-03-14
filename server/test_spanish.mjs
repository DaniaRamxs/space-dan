/**
 * Tests all available providers for Spanish subtitle/dub support
 * and CDN accessibility from the server.
 */
import pkg from '@consumet/extensions';
const { ANIME } = pkg;

console.log('Available providers:', Object.keys(ANIME).join(', '));

async function testProviderSpanish(name, ProviderClass) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`PROVIDER: ${name}`);

  let provider;
  try { provider = new ProviderClass(); } catch (e) {
    console.log(`   ❌ Cannot instantiate: ${e.message?.substring(0, 60)}`);
    return null;
  }

  try {
    // Search for a known anime with Spanish dub/sub
    const search = await provider.search('Naruto');
    const results = search?.results || search || [];
    if (!results.length) { console.log('   ❌ 0 search results'); return null; }
    console.log(`   ✅ Search: ${results.length} results — "${results[0]?.title}"`);

    const anime = results[0];
    const fetchFn = provider.fetchAnimeInfo || provider.getAnimeInfo;
    if (!fetchFn) { console.log('   ❌ No info function'); return null; }

    const info = await fetchFn.call(provider, anime.id);
    if (!info?.episodes?.length) { console.log('   ❌ No episodes'); return null; }
    console.log(`   ✅ ${info.episodes.length} episodes`);

    const ep = info.episodes[0];
    const srcFn = provider.fetchEpisodeSources || provider.getEpisodeSources;
    if (!srcFn) { console.log('   ❌ No sources function'); return null; }

    const sources = await srcFn.call(provider, ep.id, anime.id);
    const srcs = sources?.sources || [];
    const subs = sources?.subtitles || [];
    const headers = sources?.headers || {};

    console.log(`   Sources: ${srcs.length}`);
    if (srcs.length) {
      srcs.forEach(s => console.log(`     - ${s.quality || 'default'} | isDub: ${s.isDub} | ${s.url?.substring(0, 60)}`));
    }

    if (subs.length) {
      console.log(`   Subtitles (${subs.length}):`);
      subs.forEach(s => console.log(`     - [${s.lang}] ${s.label || ''} → ${s.url?.substring(0, 60)}`));
      const hasSpanish = subs.some(s => 
        s.lang?.toLowerCase().includes('es') || 
        s.lang?.toLowerCase().includes('spa') ||
        s.label?.toLowerCase().includes('español') ||
        s.label?.toLowerCase().includes('spanish')
      );
      console.log(`   🇪🇸 Spanish subs: ${hasSpanish ? '✅ YES' : '❌ No'}`);
    } else {
      console.log(`   Subtitles: none`);
    }

    // Check if CDN is accessible from server
    if (srcs.length) {
      const cdnUrl = srcs[0].url;
      const cdnHeaders = {
        'User-Agent': 'Mozilla/5.0',
        'Referer': `https://${name.toLowerCase()}.com/`,
      };
      try {
        const cdnRes = await fetch(cdnUrl, { headers: cdnHeaders });
        console.log(`   CDN: ${cdnRes.status} ${cdnRes.status === 200 ? '✅ Accessible' : '❌ Blocked'}`);
      } catch (e) {
        console.log(`   CDN: ❌ Fetch error: ${e.message?.substring(0, 50)}`);
      }
    }

    return { name, srcs, subs };
  } catch (e) {
    console.log(`   ❌ Error: ${e.message?.substring(0, 100)}`);
    return null;
  }
}

const results = [];
for (const [name, Cls] of Object.entries(ANIME)) {
  const result = await testProviderSpanish(name, Cls);
  if (result) results.push(result);
}

console.log(`\n${'═'.repeat(55)}`);
console.log('SUMMARY:');
results.forEach(r => {
  const spanishSub = r.subs.some(s => 
    s.lang?.toLowerCase().includes('es') || 
    s.label?.toLowerCase().includes('español')
  );
  console.log(`  ${r.name}: ${r.srcs.length} sources, ${r.subs.length} subs ${spanishSub ? '🇪🇸' : ''}`);
});
process.exit(0);
