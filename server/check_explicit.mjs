import pkg from '@consumet/extensions';
const { ANIME } = pkg;
console.log('pkg.ANIME.Gogoanime:', !!ANIME.Gogoanime);
console.log('pkg.ANIME.GogoAnime:', !!ANIME.GogoAnime);
console.log('pkg.Gogoanime:', !!pkg.Gogoanime);
console.log('pkg.GogoAnime:', !!pkg.GogoAnime);
process.exit(0);
