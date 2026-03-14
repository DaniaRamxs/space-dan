/**
 * youtubeService.js
 * Servicio para buscar videos en YouTube a través del backend
 * Usa yt-search en el servidor para evitar límites de quota de la API de YouTube
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const youtubeService = {
    /**
     * Busca videos en YouTube a través del backend
     * @param {string} query 
     * @returns {Promise<Array>} List of video objects
     */
    async searchVideos(query, limit = 10) {
        if (!query?.trim()) {
            return this._getFallbackVideos('');
        }

        try {
            // Usar el endpoint del backend en lugar de la API de YouTube directamente
            const response = await fetch(
                `${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                throw new Error('Backend search failed');
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            // Mapear los datos del backend al formato esperado por el frontend
            const videos = result.data.map(video => ({
                id: video.id,
                title: video.title,
                artist: video.artist || video.channel,
                name: video.title,
                thumbnail: video.thumbnail,
                cover: video.thumbnail,
                duration: video.duration,
                url: video.url
            }));

            console.log(`[YouTube] Results from ${result.source}:`, videos.length, 'videos');
            return videos;

        } catch (err) {
            console.warn('[YouTube] Backend search failed, using fallback:', err.message);
            return this._getFallbackVideos(query);
        }
    },

    /**
     * Fallback videos cuando el backend no está disponible
     */
    _getFallbackVideos(query) {
        const fallbackVideos = [
            {
                id: 'dQw4w9WgXcQ',
                title: 'Never Gonna Give You Up - Rick Astley',
                name: 'Never Gonna Give You Up - Rick Astley',
                artist: 'Rick Astley',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
            },
            {
                id: '9bZkp7q19f0',
                title: 'PSY - GANGNAM STYLE (강남스타일)',
                name: 'PSY - GANGNAM STYLE (강남스타일)',
                artist: 'PSY',
                thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg',
                cover: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg'
            },
            {
                id: 'kJQP7kiw5Fk',
                title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
                name: 'Luis Fonsi - Despacito ft. Daddy Yankee',
                artist: 'Luis Fonsi',
                thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
                cover: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg'
            },
            {
                id: 'hT_nvWreIhg',
                title: 'Mark Ronson - Uptown Funk ft. Bruno Mars',
                name: 'Mark Ronson - Uptown Funk ft. Bruno Mars',
                artist: 'Mark Ronson',
                thumbnail: 'https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg',
                cover: 'https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg'
            },
            {
                id: 'YQHsXMglC9A',
                title: 'Adele - Hello',
                name: 'Adele - Hello',
                artist: 'Adele',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg',
                cover: 'https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg'
            }
        ];
        
        // Filtrar por query si existe
        if (query?.trim()) {
            const filtered = fallbackVideos.filter(video => 
                video.title.toLowerCase().includes(query.toLowerCase()) ||
                video.artist.toLowerCase().includes(query.toLowerCase())
            );
            return filtered.length > 0 ? filtered : fallbackVideos.slice(0, 3);
        }
        
        return fallbackVideos;
    },

    /**
     * Busca shorts (videos cortos) en YouTube a través del backend
     * Appends #shorts to query and passes videoDuration=short parameter
     * @param {string} query
     * @returns {Promise<Array>} List of short video objects
     */
    async searchShorts(query, limit = 15) {
        if (!query?.trim()) {
            return this._getFallbackShorts();
        }

        try {
            const searchQuery = `${query.trim()} #shorts`;
            const response = await fetch(
                `${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(searchQuery)}&videoDuration=short`
            );

            if (!response.ok) {
                throw new Error('Backend shorts search failed');
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            const videos = result.data.map(video => ({
                id: video.id,
                title: video.title,
                artist: video.artist || video.channel,
                name: video.title,
                thumbnail: video.thumbnail,
                cover: video.thumbnail,
                duration: video.duration,
                url: video.url,
                isShort: true
            }));

            console.log(`[YouTube] Shorts results from ${result.source}:`, videos.length, 'shorts');
            return videos;

        } catch (err) {
            console.warn('[YouTube] Backend shorts search failed, using fallback:', err.message);
            // Fallback to normal search with #shorts appended
            return this.searchVideos(`${query} #shorts`, limit);
        }
    },

    /**
     * Fallback shorts when backend is unavailable
     */
    _getFallbackShorts() {
        return [
            {
                id: 'dQw4w9WgXcQ',
                title: 'Rick Roll Short',
                name: 'Rick Roll Short',
                artist: 'Rick Astley',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                isShort: true
            }
        ];
    },

    /**
     * Obtiene detalles de un video específico
     * (Ya no necesita API key, usa el backend)
     */
    async getVideoDetails(videoId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(videoId)}`
            );
            const data = await response.json();
            return data.data?.[0] || null;
        } catch (err) {
            console.warn('[YouTube] Get details failed:', err.message);
            return null;
        }
    }
};
