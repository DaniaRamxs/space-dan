import pkg from '@consumet/extensions';
const { ANIME } = pkg;
try {
    const h = new ANIME.Hianime();
    console.log('Successfully created Hianime');
} catch (e) {
    console.log('Failed Hianime:', e.message);
}
process.exit(0);
