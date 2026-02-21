import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Wpage() {
  const navigate = useNavigate();

  const enter = useCallback(() => navigate("/home"), [navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  return (
    <main className="wpageWrap">
      <div className="wpageCard">
        <div className="wpageHeader">
          <div className="wpageTitle">⚠️ Bienvenid@ a mi rincón</div>
          <div className="wpageWarning">
            Antes de entrar, una advertencia:
          </div>
        </div>

        <div className="wpageGrid">
          <img
            className="wpageMascot"
            src="https://media.tenor.com/sL7j2ptkGg4AAAAj/hi.gif"
            alt="mascot"
            width={200}
            height={200}
            loading="eager"
          />

          <div className="wpageBody">
            <div className="wpageText">
              Este sitio es mi espacio personal. Puede contener:
            </div>

            <ul className="wpageList">
              <li>muchos gifs</li>
              <li>música (a veces)</li>
              <li>mucho texto</li>
              <li>cosas sin optimizar (xd)</li>
            </ul>

            <div className="wpageHint">
              Presiona <span className="kbd">Enter</span> o toca el botón 👇
            </div>

            <button className="wpageEnterBtn" onClick={enter}>
              ENTRAR ✦
            </button>

            <div className="wpageFooter tinyText">
              si algo carga lento: es estética, no lag (bueno… a veces es lag)
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
