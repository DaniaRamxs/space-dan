// CSS puro en vez de framer-motion — mismo efecto visual, sin overhead de JS
const orbStyle = {
    willChange: 'transform',
};

export default function AmbientOrbs() {
    return (
        <>
            <style>{`
                @keyframes orbFloat1 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    33%     { transform: translate(80px,-80px) scale(1.15); }
                    66%     { transform: translate(-40px,40px) scale(0.92); }
                }
                @keyframes orbFloat2 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    33%     { transform: translate(-80px,120px) scale(1.08); }
                    66%     { transform: translate(40px,-70px) scale(1.15); }
                }
                @keyframes orbFloat3 {
                    0%,100% { transform: translate(0,0); }
                    50%     { transform: translate(60px,40px); }
                }
            `}</style>
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none">
                <div
                    style={{ ...orbStyle, animation: 'orbFloat1 25s ease-in-out infinite' }}
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[80px]"
                />
                <div
                    style={{ ...orbStyle, animation: 'orbFloat2 35s ease-in-out infinite 2s' }}
                    className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-purple-500/5 blur-[90px]"
                />
                <div
                    style={{ ...orbStyle, animation: 'orbFloat3 40s ease-in-out infinite 5s' }}
                    className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-cyan-400/5 blur-[70px]"
                />
            </div>
        </>
    );
}
