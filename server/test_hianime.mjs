import pkg from '@consumet/extensions';
const { ANIME } = pkg;

const hianime = new ANIME.Hianime();

async function test() {
    try {
        console.log('Searching for One Piece...');
        const search = await hianime.search('One Piece');
        const anime = search.results[0];
        console.log('Found:', anime.title, 'ID:', anime.id);

        console.log('Fetching info...');
        const info = await hianime.fetchAnimeInfo(anime.id);
        console.log('Episodes found:', info.episodes.length);

        const ep1 = info.episodes[0];
        console.log('Episode 1 ID:', ep1.id);

        console.log('Fetching sources for ep 1...');
        const sources = await hianime.fetchEpisodeSources(ep1.id);
        console.log('Sources:', JSON.stringify(sources, null, 2));

    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
