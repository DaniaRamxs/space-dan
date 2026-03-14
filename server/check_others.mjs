import pkg from '@consumet/extensions';
console.log('MOVIES keys:', Object.keys(pkg.MOVIES || {}));
console.log('META keys:', Object.keys(pkg.META || {}));
process.exit(0);
