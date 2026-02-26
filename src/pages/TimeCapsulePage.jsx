import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TimeCapsulePage() {
    const [time, setTime] = useState('');

    // Simulación de cuenta regresiva hacia el 2027
    useEffect(() => {
        const targetDate = new Date('2027-01-01T00:00:00').getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                setTime("ACCESS_GRANTED");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTime(`${days}d : ${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="timeCapsulePage">
            <div className="capsuleHeader">
                <Link to="/posts" className="capsuleBack">{'[TERMINATE_CONNECTION]'}</Link>
                <div className="capsuleWarning blinkText">WARNING: ENCRYPTED VAULT</div>
            </div>

            <div className="capsuleContent">
                <div className="capsuleLockIcon">🔒</div>
                <h1 className="capsuleTitle">TIME CAPSULE_V1</h1>
                <p className="capsuleText">
                    ESTA BÓVEDA CONTIENE ARCHIVOS CLASIFICADOS, PENSAMIENTOS BORRADOS Y RECUERDOS FUTUROS.
                    EL ACCESO ESTÁ DENEGADO HASTA LA FECHA DE DESBLOQUEO.
                </p>

                <div className="capsuleTimerBox">
                    <div className="capsuleTimerLabel">TIME_REMAINING</div>
                    <div className="capsuleTimerValue">{time}</div>
                </div>

                <div className="capsuleDecryption">
                    Iniciando ataque de fuerza bruta... <span className="capsuleFail">ERROR [401]</span>
                </div>
            </div>

            <div className="capsuleScanlines"></div>
        </div>
    );
}
