import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

const AnimePlayer = ({ 
    src, 
    subtitles = [], 
    onTimeUpdate, 
    onPlay, 
    onPause, 
    onSeek,
    isHost = false,
    externalState = {} // { isPlaying, currentTime }
}) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeout = useRef(null);

    useEffect(() => {
        if (!src) return;

        const video = videoRef.current;

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    console.error('HLS Fatal Error:', data.type);
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Network Error, trying to recover...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Media Error, trying to recover...');
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            break;
                    }
                }
            });
            hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [src]);

    // Handle external sync
    useEffect(() => {
        if (!isHost && videoRef.current) {
            if (externalState.isPlaying !== undefined) {
                if (externalState.isPlaying) videoRef.current.play().catch(() => {});
                else videoRef.current.pause();
            }
            if (externalState.currentTime !== undefined) {
                const diff = Math.abs(videoRef.current.currentTime - externalState.currentTime);
                if (diff > 1.5) { // Only sync if diff > 1.5 seconds (prevents stuttering)
                    videoRef.current.currentTime = externalState.currentTime;
                }
            }
        }
    }, [externalState, isHost]);

    const handlePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            if (onPlay) onPlay(videoRef.current.currentTime);
        } else {
            videoRef.current.pause();
            if (onPause) onPause(videoRef.current.currentTime);
        }
    };

    const handleTimeUpdate = () => {
        setCurrentTime(videoRef.current.currentTime);
        if (isHost && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        setDuration(videoRef.current.duration);
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
        if (onSeek) onSeek(time);
    };

    const toggleMute = () => {
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e) => {
        const vol = parseFloat(e.target.value);
        videoRef.current.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current.parentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const autoHideControls = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    return (
        <div 
            className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group border border-white/10 shadow-2xl"
            onMouseMove={autoHideControls}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <video
                ref={videoRef}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handlePlayPause}
            >
                {subtitles.map((sub, index) => (
                    <track 
                        key={index}
                        kind="subtitles"
                        src={sub.url}
                        srcLang={sub.lang || 'es'}
                        label={sub.label || 'Español'}
                        default={index === 0}
                    />
                ))}
            </video>

            {/* Custom Controls */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 mb-4 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    disabled={!isHost && Object.keys(externalState).length > 0}
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handlePlayPause}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        >
                            {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
                        </button>

                        <div className="flex items-center gap-2 group/volume">
                            <button onClick={toggleMute} className="text-white">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        <span className="text-white text-sm font-medium">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="text-white/70 hover:text-white transition-colors">
                            <Settings size={20} />
                        </button>
                        <button 
                            onClick={toggleFullscreen}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Host Badge */}
            <div className="absolute top-4 left-4 flex gap-2">
                {isHost && (
                    <span className="px-2 py-1 bg-purple-600/80 backdrop-blur-md text-white text-[10px] uppercase font-bold rounded-md border border-purple-400/50">
                        Host
                    </span>
                )}
                {Object.keys(externalState).length > 0 && !isHost && (
                    <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-md text-white text-[10px] uppercase font-bold rounded-md border border-blue-400/50">
                        Synced
                    </span>
                )}
            </div>
        </div>
    );
};

export default AnimePlayer;
