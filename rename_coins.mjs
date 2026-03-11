import fs from 'fs';
import path from 'path';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', '.git', 'dist'].includes(file)) {
                walk(fullPath);
            }
        } else if (/\.(js|jsx|css|sql|md)$/.test(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const og = content;
            content = content
                .replace(/Dancoins/g, 'Starlys')
                .replace(/Dancoin/g, 'Starly')
                .replace(/dancoins/g, 'starlys')
                .replace(/dancoin/g, 'starly');
            if (content !== og) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

walk('src');
walk('supabase');
console.log('Done!');
