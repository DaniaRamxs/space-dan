/**
 * youtubeService.js
 * Servicio para buscar videos en YouTube y manejar la integración con el reproductor.
 */

// NOTA: Para búsqueda real se requiere VITE_YOUTUBE_API_KEY en el .env
// Si no hay key, podemos usar un fallback o avisar al usuario.
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export const youtubeService = {
    /**
     * Busca videos en YouTube
     * @param {string} query 
     * @returns {Promise<Array>} List of video objects
     */
    async searchVideos(query, limit = 10) {
        if (!YOUTUBE_API_KEY) {
            console.warn('[YouTube] No API Key found. Using fallback search...');
            // Fallback: Sugerir al usuario que añada la key o usar un proxy si existiera.
            // Por ahora, intentaremos una búsqueda vía Edge Function si existe, 
            // o retornaremos un error descriptivo.
            throw new Error('Falta configuración: VITE_YOUTUBE_API_KEY no encontrada en el archivo .env');
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${limit}&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error en la búsqueda de YouTube');
            }

            const data = await response.json();
            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                description: item.snippet.description
            }));
        } catch (err) {
            console.error('[YouTube Service] Error:', err);
            throw err;
        }
    },

    /**
     * Obtiene detalles de un video específico
     */
    async getVideoDetails(videoId) {
        if (!YOUTUBE_API_KEY) return null;
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        return data.items?.[0] || null;
    }
};
