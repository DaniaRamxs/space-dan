import pkg from '@consumet/extensions';
const { ANIME } = pkg;
try {
    const a = new ANIME.AnimePahe();
    console.log('Successfully created AnimePahe');
} catch (e) {
    console.log('Failed AnimePahe:', e.message);
}
process.exit(0);
