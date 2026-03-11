import { motion } from 'framer-motion';

export const SkeletonBase = ({ className }) => (
    <div className={`bg-white/[0.03] rounded-2xl overflow-hidden relative ${className}`}>
        <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
        />
    </div>
);

export const PostSkeleton = () => (
    <div className="bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] p-6 space-y-6">
        <div className="flex gap-4">
            <SkeletonBase className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
                <SkeletonBase className="h-3 w-1/4" />
                <SkeletonBase className="h-2 w-1/5 opacity-50" />
            </div>
        </div>
        <div className="space-y-3">
            <SkeletonBase className="h-4 w-full" />
            <SkeletonBase className="h-4 w-5/6" />
            <SkeletonBase className="h-4 w-4/6 opacity-50" />
        </div>
        <div className="flex gap-4 pt-2">
            <SkeletonBase className="h-8 w-24 rounded-full" />
            <SkeletonBase className="h-8 w-24 rounded-full" />
        </div>
    </div>
);
