import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { useAudioController } from '../../hooks/useAudioController';

export default function SoundIndicator({ trackId, previewUrl }) {
    const { isPlaying } = useAudioController(trackId, previewUrl);

    return (
        <div className="flex items-center gap-1 h-3 min-w-[14px]">
            {isPlaying ? (
                <div className="flex items-end gap-0.5 h-full">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                height: ["20%", "100%", "40%", "80%", "20%"]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 0.6 + (i * 0.1),
                                ease: "easeInOut"
                            }}
                            className="w-[1.5px] bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.4)]"
                        />
                    ))}
                </div>
            ) : (
                <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <Music size={12} className="text-white/20" />
                </motion.div>
            )}
        </div>
    );
}
