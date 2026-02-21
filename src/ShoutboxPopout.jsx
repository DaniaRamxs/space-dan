import { useState } from "react";

export default function ShoutboxDock() {
  const [minimized, setMinimized] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const handleToggle = () => {
    if (minimized && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
    setMinimized((v) => !v);
  };

  // Cargar el iframe la primera vez que el usuario abre el shoutbox
  if (!minimized && !hasBeenOpened) {
    setHasBeenOpened(true);
  }

  return (
    <div className={`shoutDock ${minimized ? "minimized" : ""}`}>
      <div className="shoutDockHeader">
        <span className="shoutDockTitle">Shoutbox</span>

        <button
          className="shoutDockMinBtn"
          onClick={handleToggle}
          aria-label={minimized ? "Expandir shoutbox" : "Minimizar shoutbox"}
        >
          {minimized ? "▢" : "—"}
        </button>
      </div>

      {!minimized && (
        <div className="shoutDockBody">
          {hasBeenOpened && (
            <iframe
              src="https://www3.cbox.ws/box/?boxid=3551223&boxtag=TAHvLn"
              title="Shoutbox"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              loading="lazy"
              style={{ overflow: "auto", width: "100%", height: "100%", border: 0 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
