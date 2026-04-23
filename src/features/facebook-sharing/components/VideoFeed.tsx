'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FacebookVideo } from '../types';
import { MOCK_VIDEOS } from '../data/mockVideos';
import { Play, Tag, Clock } from 'lucide-react';

interface VideoFeedProps {
  onSelect: (video: FacebookVideo) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  show: { opacity: 1, scale: 1, y: 0 }
};

export const VideoFeed: React.FC<VideoFeedProps> = ({ onSelect }) => {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"
    >
      {MOCK_VIDEOS.map((video) => (
        <motion.div 
          key={video.id}
          variants={item}
          onClick={() => onSelect(video)}
          className="group relative backdrop-blur-3xl bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden cursor-pointer transition-all hover:bg-white/[0.05] hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* Card Content Wrapper */}
          <div className="relative aspect-video bg-[#0c0c1e] overflow-hidden">
            {/* Mock Thumbnail / Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10" />
            
            {/* Play Hover Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/20 backdrop-blur-sm">
                <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black shadow-2xl"
                >
                    <Play size={24} fill="currentColor" />
                </motion.div>
            </div>

            {/* Type Badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <div className={`w-1.5 h-1.5 rounded-full ${video.type === 'reel' ? 'bg-pink-500 animate-pulse' : 'bg-blue-400'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{video.type}</span>
            </div>
          </div>
          
          <div className="p-6 relative">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1 text-[10px] text-white/30 font-bold">
                 <Tag size={10} /> {video.category}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/30 font-bold">
                 <Clock size={10} /> 3:24
              </div>
            </div>
            
            <h4 className="text-white font-bold text-lg leading-snug group-hover:text-blue-400 transition-colors h-14 line-clamp-2">
              {video.title}
            </h4>

            {/* Subtle light hit bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Liquid Glass Overlay on Card */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/[0.03] via-transparent to-white/[0.01] pointer-events-none" />
        </motion.div>
      ))}
    </motion.div>
  );
};
