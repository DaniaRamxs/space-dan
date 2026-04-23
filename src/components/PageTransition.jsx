// Render directo — sin framer-motion. En Capacitor hard-nav la animación de
// opacity:0→1 a veces queda atascada en opacity:0 y la página nunca aparece.
export default function PageTransition({ children }) {
    return (
        <div className="w-full min-h-full">
            {children}
        </div>
    );
}
