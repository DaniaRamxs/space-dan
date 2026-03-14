import pkg from '@consumet/extensions';
const { ANIME } = pkg;
const h = new ANIME.Hianime();
console.log('Hianime methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(h)));
process.exit(0);
