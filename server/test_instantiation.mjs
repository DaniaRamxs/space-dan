import pkg from '@consumet/extensions';
const { ANIME } = pkg;
try {
    const g = new ANIME.Gogoanime();
    console.log('Successfully created Gogoanime');
} catch (e) {
    console.log('Failed Gogoanime:', e.message);
}
try {
    const g2 = new ANIME.GogoAnime();
    console.log('Successfully created GogoAnime');
} catch (e) {
    console.log('Failed GogoAnime:', e.message);
}
process.exit(0);
