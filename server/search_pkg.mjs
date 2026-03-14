import pkg from '@consumet/extensions';
function findKey(obj, target, path = '') {
    for (let key in obj) {
        if (key.toLowerCase().includes(target.toLowerCase())) {
            console.log('Found:', path + key);
        }
        if (typeof obj[key] === 'object' && obj[key] !== null && path.length < 50) {
            findKey(obj[key], target, path + key + '.');
        }
    }
}
findKey(pkg, 'Gogo');
findKey(pkg, 'Zoro');
process.exit(0);
