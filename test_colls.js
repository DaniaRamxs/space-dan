import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envC = fs.readFileSync('.env', 'utf8');
const env = envC.split('\n').reduce((acc, l) => { const [k, v] = l.split('='); if (k) acc[k.trim()] = v?.trim(); return acc; }, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // try to execute the open_chest rpc
    const { data: user } = await supabase.auth.signInWithPassword({ email: 'test@test.com', password: 'password' }); // I don't have this.
    console.log(user);
}
check();
