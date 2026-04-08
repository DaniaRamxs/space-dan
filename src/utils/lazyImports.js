import { lazy } from 'react';

// Lazy loading con loading states personalizados
export const lazyLoad = (importFunc, fallback = null) => {
  return lazy(importFunc);
};

// Componentes pesados - carga bajo demanda
export const LazyTetrisGame = lazyLoad(() => import('../components/TetrisGame'));
export const LazySnakeGame = lazyLoad(() => import('../components/SnakeGame'));
export const LazyPixelGalaxy = lazyLoad(() => import('../components/PixelGalaxy/PixelGalaxyGame'));
export const LazyAsteroidBattle = lazyLoad(() => import('../components/AsteroidBattleGame'));

// Voice/Chat - solo en voice rooms
export const LazyVoiceRoomUI = lazyLoad(() => import('../components/VoiceRoom/VoiceRoomUI'));
export const LazyLiveKitComponents = lazyLoad(() => import('@livekit/components-react'));

// Markdown - solo en posts
export const LazyReactMarkdown = lazyLoad(() => import('react-markdown'));

// Canvas - solo en juegos
export const LazyKonva = lazyLoad(() => import('konva'));
export const LazyReactKonva = lazyLoad(() => import('react-konva'));

// Gifs - solo en chat
export const LazyGiphyComponents = lazyLoad(() => import('@giphy/react-components'));
