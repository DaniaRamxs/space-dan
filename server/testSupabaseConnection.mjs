import { supabase } from './supabaseClient.mjs';

async function testConnection() {
    if (!supabase) {
        console.error('[Supabase Test] ❌ Supabase no está configurado. Verifica las variables de entorno.');
        return false;
    }

    console.log('[Supabase Test] Intentando conexión...');
    try {
        // Prueba de conexión simple
        const { data, error } = await supabase.from('pixel_galaxy').select('*').limit(1);
        if (error) {
            console.error('[Supabase Test] ❌ Error al conectar con la tabla pixel_galaxy:', error.message, error.details || '');
            return false;
        } else {
            console.log('[Supabase Test] ✅ Conexión exitosa. Tabla pixel_galaxy accesible.');
        }

        // Prueba de inserción
        const testX = 50;
        const testY = 50;
        const { error: insertError } = await supabase.from('pixel_galaxy').insert({
            room_name: 'test_room',
            x: testX,
            y: testY,
            color: '#FFFFFF',
            user_id: 'test_user',
            username: 'test',
            placed_at: new Date().toISOString()
        });
        if (insertError) {
            console.error('[Supabase Test] ❌ Error al insertar en pixel_galaxy:', insertError.message, insertError.details || '');
            return false;
        } else {
            console.log('[Supabase Test] ✅ Inserción exitosa en pixel_galaxy.');
        }

        // Limpieza del registro de prueba
        await supabase.from('pixel_galaxy').delete().eq('room_name', 'test_room').eq('x', testX).eq('y', testY);
        return true;
    } catch (e) {
        console.error('[Supabase Test] ❌ Excepción durante la prueba de conexión:', e.message);
        return false;
    }
}

testConnection().then(result => {
    console.log('[Supabase Test] Resultado final:', result ? 'Éxito' : 'Fallo');
    process.exit(result ? 0 : 1);
});
