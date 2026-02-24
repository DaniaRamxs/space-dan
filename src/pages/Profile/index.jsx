// src/pages/Profile/index.jsx
import { useAuthContext } from '../../contexts/AuthContext';
import { useParams, Navigate } from 'react-router-dom';
import ProfileOwn from './ProfileOwn';
import ProfilePublic from './ProfilePublic';

export default function ProfileRouter() {
    const { user, loading } = useAuthContext();
    const { userId } = useParams(); // Puede venir como /profile/:userId

    // Si aún está cargando el Auth, mostramos un estatus genérico o esperamos
    if (loading) {
        return <div className="card text-center blinkText">Cargando perfil...</div>;
    }

    // 1. Caso: El usuario intenta entrar a `/profile` genérico (Mi Perfil)
    if (!userId) {
        // Si no está logueado, se envía por default al propio componente para que 
        // muestre el mensaje de "MI PERFIL - Inicia sesión..."
        // O puedes desviar a /home si quieres ser más estricto
        return <ProfileOwn />;
    }

    // 2. Caso: El usuario visitó `/profile/:userId` y es SU PROPIO perfil
    // Prevenimos el leak rebotándolo al Dashboard oficial
    if (user && user.id === userId) {
        return <Navigate to="/profile" replace />;
    }

    // 3. Caso: El usuario visitó `/profile/:userId` de un TERCERO
    // O es un visitante anónimo intentando ver cualquier perfil
    return <ProfilePublic />;
}
