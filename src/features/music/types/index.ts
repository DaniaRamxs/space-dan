export interface JukeboxTrack {
  id: string;
  name: string;
  artist: string;
  cover: string;
  addedBy: string;
  addedById: string;
  boostPower: number; // Starlys (◈) acumulados para esta canción
  duration?: number;
  source: 'youtube' | 'spotify';
}

export interface JukeboxState {
  queue: JukeboxTrack[];
  currentTrack: JukeboxTrack | null;
  isPlaying: boolean;
  progress: number; // 0 to 100
  currentTime: number; // s
  lastUpdatedAt: number; // timestamp
}
