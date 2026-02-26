import { useState } from 'react';
import { Link } from 'react-router-dom';

function DreamNode({ text, top, left, delay, onHover, onLeave }) {
    const [hovered, setHovered] = useState(false);

    const handleEnter = () => { setHovered(true); onHover(text); };
    const handleLeave = () => { setHovered(false); onLeave(); };
    const handleToggle = () => {
        if (hovered) { handleLeave(); }
        else { handleEnter(); }
    };

    return (
        <div
            className={`dreamNode ${hovered ? 'active' : ''}`}
            style={{ top, left, animationDelay: delay }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={handleToggle}
        >
            <div className="dreamLight"></div>
            <div className="dreamText desktopOnly">{text}</div>
        </div>
    );
}

export default function DreamscapePage() {
    const [activeText, setActiveText] = useState('');

    const dreams = [
        { id: 1, text: "hola si , es dificil saber que poner aqui", top: "20%", left: "25%", delay: "0s" },
        { id: 2, text: "¿sabian que me gusta fiore?", top: "60%", left: "20%", delay: "1.2s" },
        { id: 3, text: "me gusta el chocomenta", top: "40%", left: "70%", delay: "0.5s" },
        { id: 4, text: "no me he visto todo star wars", top: "70%", left: "55%", delay: "2.1s" },
        { id: 5, text: "me daban miedo los payasos de niña", top: "25%", left: "75%", delay: "1.8s" },
        { id: 6, text: "extraño a chimuelo", top: "85%", left: "30%", delay: "3.5s" }
    ];

    return (
        <div className="dreamscapeContainer">
            {/* Estrellas estáticas en el fondo negro absoluto */}
            <div className="dreamscapeStars"></div>

            <Link to="/posts" className="dreamscapeExit">
                [despertar]
            </Link>

            <div className="dreamscapeHint">
                explora la oscuridad...
            </div>

            <div className={`dreamMobileText ${activeText ? 'show' : ''}`}>
                {activeText}
            </div>

            {dreams.map(dream => (
                <DreamNode
                    key={dream.id}
                    text={dream.text}
                    top={dream.top}
                    left={dream.left}
                    delay={dream.delay}
                    onHover={setActiveText}
                    onLeave={() => setActiveText('')}
                />
            ))}
        </div>
    );
}
