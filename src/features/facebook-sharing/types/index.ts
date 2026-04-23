export interface FacebookVideo {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  type: 'video' | 'reel';
  category?: string;
}

export interface FacebookSharingState {
  currentVideo: FacebookVideo | null;
  history: FacebookVideo[];
  isDiscoveryMode: boolean;
}
