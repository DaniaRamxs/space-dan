/**
 * Test script: verifies that the AnimePahe CDN is reachable from THIS server
 * Run: node server/test_proxy.mjs
 * 
 * If this works locally but fails on Railway, the CDN is blocking Railway's IP.
 * If this fails everywhere, the session token has expired.
 */
import pkg from '@consumet/extensions';
const { ANIME } = pkg;

const CDN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://animepahe.ru/',
  'Origin': 'https://animepahe.ru',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'video',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site',
};

async function testFromServer() {
  console.log('🧪 Testing AnimePahe CDN accessibility from this server...\n');

  const provider = new ANIME.AnimePahe();

  // Step 1: Search + get real source URL
  console.log('1) Getting a fresh source URL from AnimePahe...');
  const search = await provider.search('Naruto');
  const results = search.results || search;
  const anime = results[0];
  console.log(`   Anime: ${anime.title} (${anime.id})`);

  const info = await provider.fetchAnimeInfo(anime.id);
  const ep1 = info.episodes[0];
  console.log(`   Episode 1 ID: ${ep1.id}`);

  const sources = await provider.fetchEpisodeSources(ep1.id);
  if (!sources.sources?.length) {
    console.error('❌ No sources found from provider!');
    process.exit(1);
  }

  const m3u8Url = sources.sources[0].url;
  console.log(`   M3U8 URL: ${m3u8Url.substring(0, 80)}...`);

  // Step 2: Test fetching the m3u8 with CDN headers
  console.log('\n2) Testing fetch WITH CDN headers (what our proxy does)...');
  const withHeaders = await fetch(m3u8Url, { headers: CDN_HEADERS });
  console.log(`   Status: ${withHeaders.status} ${withHeaders.statusText}`);
  
  if (withHeaders.ok) {
    const text = await withHeaders.text();
    const lines = text.split('\n').filter(l => l.trim());
    console.log(`   ✅ SUCCESS! M3U8 has ${lines.length} lines`);
    console.log(`   First segment: ${lines.find(l => !l.startsWith('#'))?.substring(0, 80)}`);
  } else {
    const body = await withHeaders.text();
    console.error(`   ❌ FAILED with ${withHeaders.status}:`, body.substring(0, 200));
  }

  // Step 3: Test WITHOUT headers (to confirm CDN requires them)
  console.log('\n3) Testing fetch WITHOUT headers (should fail with 403)...');
  const withoutHeaders = await fetch(m3u8Url);
  console.log(`   Status: ${withoutHeaders.status} - ${withoutHeaders.status === 403 ? '✅ Expected (CDN blocks direct access)' : '⚠️ Unexpected' }`);

  // Step 4: Check if HTTPS is supported
  console.log('\n4) Checking CDN hostname...');
  const cdnUrl = new URL(m3u8Url);
  console.log(`   CDN host: ${cdnUrl.hostname}`);
  console.log(`   Protocol: ${cdnUrl.protocol}`);

  console.log('\n✅ Test complete!');
  process.exit(0);
}

testFromServer().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
