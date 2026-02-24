/**
 * safeStorage.js
 * Manejo seguro, versionado y con fallback de localStorage para evitar que
 * estructuras de datos antiguas crasheen la aplicación tras una actualización.
 */

// Define aquí las estructuras base y migraciones de cada juego
const STORAGE_SCHEMAS = {
    // Configuración genérica de juegos o de Snake
    'space-dan-snake-data': {
        version: 2,
        defaultData: { highscore: 0 },
        migrations: {
            1: (oldData) => ({ highscore: oldData.highscore || oldData.score || 0 })
        }
    },
    'space-dan-memory-data': {
        version: 1,
        defaultData: { bestTime: null, matches: 0 },
        migrations: {}
    },
    'space-dan-tetris-data': {
        version: 1,
        defaultData: { highscore: 0 },
        migrations: {}
    },
    'space-dan-2048-data': {
        version: 1,
        defaultData: { highscore: 0 },
        migrations: {}
    },
    'space-dan-flappy-data': {
        version: 1,
        defaultData: { highscore: 0 },
        migrations: {}
    }
};

/**
 * Lee de localStorage. Si hay un error de parseo o la key no tiene schema definido,
 * devuelve un valor por defecto estructurado de forma segura.
 */
export const getSafeStorage = (key, fallbackDefault = null) => {
    const schema = STORAGE_SCHEMAS[key];

    // Si no tenemos un schema para esto, usamos fallback seguro normal
    // Esto es por si queremos usar safeStorage para cosas genéricas fuera de juegos
    if (!schema) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallbackDefault;
        } catch (e) {
            console.warn(`[SafeStorage] Parse error on non-schema key: ${key}`);
            localStorage.removeItem(key);
            return fallbackDefault;
        }
    }

    try {
        const rawData = localStorage.getItem(key);

        // Si no hay datos, retornamos el por defecto nuevo
        if (!rawData) {
            return schema.defaultData;
        }

        const parsed = JSON.parse(rawData);

        // ¿Es data cruda antigua sin envoltura de versión?
        if (!parsed || typeof parsed !== 'object' || !('_version' in parsed)) {
            console.warn(`[SafeStorage] Legacy data found for ${key}. Migrating wrapper...`);
            // Si el parse resulto en un número o primitivo, asumimos que era el score directo (muy comun en juegos viejos)
            let currentData = typeof parsed === 'number'
                ? { highscore: parsed }
                : { ...schema.defaultData, ...parsed }; // Intentar mergear campos viejos

            const payload = { _version: schema.version, data: currentData };
            localStorage.setItem(key, JSON.stringify(payload));
            return currentData;
        }

        let currentData = parsed.data;
        let currentVersion = parsed._version;

        // Ejecutar migraciones
        while (currentVersion < schema.version) {
            const migrator = schema.migrations[currentVersion];
            if (migrator) {
                currentData = migrator(currentData);
                currentVersion++;
            } else {
                console.warn(`[SafeStorage] Break in migration path for ${key} at v${currentVersion}. Resetting to default.`);
                currentData = schema.defaultData;
                currentVersion = schema.version;
                break;
            }
        }

        // Actualizar storage si hubo migración
        if (parsed._version !== schema.version) {
            localStorage.setItem(key, JSON.stringify({ _version: schema.version, data: currentData }));
        }

        return currentData;

    } catch (error) {
        console.error(`[SafeStorage] Critical error reading ${key}:`, error);
        localStorage.removeItem(key); // Limpiar datos corruptos (ej. string medio cortado)
        return schema?.defaultData || fallbackDefault;
    }
};

/**
 * Guarda en localStorage aplicando la envoltura de versionado si tiene schema.
 */
export const setSafeStorage = (key, data) => {
    const schema = STORAGE_SCHEMAS[key];

    try {
        if (schema) {
            const payload = {
                _version: schema.version,
                data: data
            };
            localStorage.setItem(key, JSON.stringify(payload));
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }
    } catch (error) {
        console.error(`[SafeStorage] Quota or writing error on ${key}:`, error);
    }
};
