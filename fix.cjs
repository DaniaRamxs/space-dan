const fs = require('fs');
let t = fs.readFileSync('supabase/seed_collectibles.sql', 'utf8');
t = t.replace('INSERT INTO public.collectibles (id, name, rarity, description, image_url)', 'INSERT INTO public.collectibles (id, name, series, rarity, description, image_url)');
t = t.replace(/^\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(NULL|'[^']+')\)(,?)$/gm, (m, id, name, rarity, desc, url, comma) => `  ('${id}', '${name}', 'Anime Universo', '${rarity}', '${desc}', ${url})${comma}`);

// Also fix the ON CONFLICT part
t = t.replace('ON CONFLICT (id) DO UPDATE SET', 'ON CONFLICT (id) DO UPDATE SET \n  series = EXCLUDED.series,');

fs.writeFileSync('supabase/seed_collectibles.sql', t);
console.log('Fixed');
