import pkg from '@consumet/extensions';
const animepahe = new pkg.ANIME.AnimePahe();
animepahe.search('Naruto').then(r => {
    console.log('AnimePahe results:', (r.results || r).length);
    process.exit(0);
}).catch(e => {
    console.error('AnimePahe error:', e.message);
    process.exit(1);
});
