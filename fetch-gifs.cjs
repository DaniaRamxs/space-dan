const fs = require('fs');

const CHARACTERS = [
    // ⭐ Comunes (30)
    { id: 'char_naruto_uzumaki', name: 'Naruto Uzumaki', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_sakura_haruno', name: 'Sakura Haruno', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_hinata_hyuga', name: 'Hinata Hyuga', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_rock_lee', name: 'Rock Lee', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_usopp', name: 'Usopp', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_chopper', name: 'Chopper', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_nami', name: 'Nami', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_zenitsu_agatsuma', name: 'Zenitsu Agatsuma', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_inosuke_hashibira', name: 'Inosuke Hashibira', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_tanjiro_kamado', name: 'Tanjiro Kamado', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_ochaco_uraraka', name: 'Ochaco Uraraka', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_mina_ashido', name: 'Mina Ashido', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_denki_kaminari', name: 'Denki Kaminari', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_yuga_aoyama', name: 'Yuga Aoyama', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_armin_arlert', name: 'Armin Arlert', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_connie_springer', name: 'Connie Springer', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_sasha_blouse', name: 'Sasha Blouse', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_momo_yaoyorozu', name: 'Momo Yaoyorozu', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_kanao_tsuyuri', name: 'Kanao Tsuyuri', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_nezuko_kamado', name: 'Nezuko Kamado', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_yui_hirasawa', name: 'Yui Hirasawa', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_ritsu_tainaka', name: 'Ritsu Tainaka', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_taiga_aisaka', name: 'Taiga Aisaka', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_yuno_gasai', name: 'Yuno Gasai', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_mikoto_misaka', name: 'Mikoto Misaka', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_tohru_honda', name: 'Tohru Honda', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_shoyo_hinata', name: 'Shoyo Hinata', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_tobio_kageyama', name: 'Tobio Kageyama', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_nobara_kugisaki', name: 'Nobara Kugisaki', rarity: 'common', desc: 'Personaje común de la colección anime.' },
    { id: 'char_yuji_itadori', name: 'Yuji Itadori', rarity: 'common', desc: 'Personaje común de la colección anime.' },

    // 🔵 Raros (20)
    { id: 'char_kakashi_hatake', name: 'Kakashi Hatake', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_itachi_uchiha', name: 'Itachi Uchiha', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_shikamaru_nara', name: 'Shikamaru Nara', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_levi_ackerman', name: 'Levi Ackerman', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_mikasa_ackerman', name: 'Mikasa Ackerman', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_gojo_satoru', name: 'Gojo Satoru', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_megumi_fushiguro', name: 'Megumi Fushiguro', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_power', name: 'Power', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_makima', name: 'Makima', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_aki_hayakawa', name: 'Aki Hayakawa', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_rem', name: 'Rem', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_ram', name: 'Ram', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_zero_two', name: 'Zero Two', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_rias_gremory', name: 'Rias Gremory', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_kurumi_tokisaki', name: 'Kurumi Tokisaki', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_akame', name: 'Akame', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_esdeath', name: 'Esdeath', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_lucy_heartfilia', name: 'Lucy Heartfilia', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_gray_fullbuster', name: 'Gray Fullbuster', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },
    { id: 'char_erza_scarlet', name: 'Erza Scarlet', rarity: 'rare', desc: 'Personaje raro de la colección anime.' },

    // 🟣 Épicos (15)
    { id: 'char_madara_uchiha', name: 'Madara Uchiha', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_obito_uchiha', name: 'Obito Uchiha', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_pain_nagato', name: 'Pain (Nagato)', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_sukuna', name: 'Sukuna', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_eren_yeager', name: 'Eren Yeager', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_ken_kaneki', name: 'Ken Kaneki', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_jotaro_kujo', name: 'Jotaro Kujo', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_dio_brando', name: 'Dio Brando', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_light_yagami', name: 'Light Yagami', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_lelouch_lamperouge', name: 'Lelouch Lamperouge', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_alucard', name: 'Alucard', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_guts', name: 'Guts', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_griffith', name: 'Griffith', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_rimuru_tempest', name: 'Rimuru Tempest', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },
    { id: 'char_anos_voldigoad', name: 'Anos Voldigoad', rarity: 'epic', desc: 'Personaje épico de la colección anime.' },

    // 🟡 Legendarios (10)
    { id: 'char_goku_ultra_instinct', name: 'Goku Ultra Instinct', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_saitama', name: 'Saitama', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_gojo_limitless', name: 'Gojo Limitless', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_eren_founding_titan', name: 'Eren Founding Titan', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_naruto_six_paths', name: 'Naruto Six Paths', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_madara_sage_mode', name: 'Madara Sage Mode', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_levi_awakened', name: 'Levi Awakened', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_aizen_sosuke', name: 'Aizen Sosuke', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_jiren', name: 'Jiren', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },
    { id: 'char_broly', name: 'Broly', rarity: 'legendary', desc: 'Personaje legendario de la colección anime.' },

    // 🌈 Míticos (5)
    { id: 'char_hatsune_miku', name: 'Hatsune Miku', rarity: 'mythic', desc: 'Personaje mítico de la colección anime.' },
    { id: 'char_astolfo', name: 'Astolfo', rarity: 'mythic', desc: 'Personaje mítico de la colección anime.' },
    { id: 'char_2b', name: '2B', rarity: 'mythic', desc: 'Personaje mítico de la colección anime.' },
    { id: 'char_asuka_langley', name: 'Asuka Langley', rarity: 'mythic', desc: 'Personaje mítico de la colección anime.' },
    { id: 'char_rei_ayanami', name: 'Rei Ayanami', rarity: 'mythic', desc: 'Personaje mítico de la colección anime.' }
];

async function asyncDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    let sqlOutput = `-- 1. ADVERTENCIA: Este comando borrará TODOS los personajes actuales de tu servidor y los inventarios de los usuarios.\n-- Ejecútalo con cuidado.\n\nDELETE FROM public.collectibles;\n\n-- 2. Insertando nueva colección de personajes anime:\n\nINSERT INTO public.collectibles (id, name, rarity, description, image_url)\nVALUES\n`;

    for (let i = 0; i < CHARACTERS.length; i++) {
        const c = CHARACTERS[i];
        try {
            // Using Tenor API
            const url = `https://g.tenor.com/v1/search?key=LIVDSRZULELA&q=${encodeURIComponent(c.name + " anime")}&limit=1`;
            const res = await fetch(url);
            const data = await res.json();
            let gifUrl = null;

            if (data.results && data.results.length > 0) {
                // Get the direct GIF url
                const media = data.results[0].media[0];
                gifUrl = media.gif ? media.gif.url : (media.mediumgif ? media.mediumgif.url : null);
            }

            console.log(`Fetched ${c.name}: ${gifUrl}`);

            sqlOutput += `  ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.rarity}', '${c.desc.replace(/'/g, "''")}', ${gifUrl ? "'" + gifUrl + "'" : 'NULL'})`;

            if (i < CHARACTERS.length - 1) {
                sqlOutput += ',\n';
            }

            // delay a bit to avoid hitting rate limits too hard
            await asyncDelay(200);

        } catch (e) {
            console.error(`Error on ${c.name}:`, e);
            sqlOutput += `  ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.rarity}', '${c.desc.replace(/'/g, "''")}', NULL)`;
            if (i < CHARACTERS.length - 1) {
                sqlOutput += ',\n';
            }
        }
    }

    sqlOutput += `\nON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  image_url = EXCLUDED.image_url;
`;

    fs.writeFileSync('supabase/seed_collectibles.sql', sqlOutput);
    console.log("Done generating SQL!");
}

run();
