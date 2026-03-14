import pkg from '@consumet/extensions';
console.log('Top level keys:', Object.keys(pkg));
if (pkg.ANIME) {
    console.log('ANIME keys:', Object.keys(pkg.ANIME));
}
process.exit(0);
