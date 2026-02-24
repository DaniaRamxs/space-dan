import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUploader({ currentAvatar, frameStyle, onUploadSuccess }) {
    const { user } = useAuthContext();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(currentAvatar || '/dan_profile.jpg');
    const [errorMsg, setErrorMsg] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validación lado cliente
        if (!ALLOWED_TYPES.includes(file.type)) {
            setErrorMsg('Formato inválido. Solo JPG, PNG o WEBP.');
            return;
        }
        if (file.size > MAX_SIZE_BYTES) {
            setErrorMsg(`El archivo es demasiado grande (máx ${MAX_SIZE_MB}MB).`);
            return;
        }

        setErrorMsg(null);
        setUploading(true);

        // Preview local inmediato (UX)
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        try {
            // 1. Subir a Supabase Storage (requiere bucket 'avatars' configurado)
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `user_avatars/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            // 2. Obtener URL pública
            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            // 3. Actualizar tabla profiles
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 4. Notificar a componentes padre
            if (onUploadSuccess) onUploadSuccess(publicUrl);

        } catch (err) {
            console.error('[AvatarUploader] Error:', err);
            setErrorMsg('No se pudo subir la imagen. Intenta de nuevo.');
            setPreviewUrl(currentAvatar || '/dan_profile.jpg'); // Rollback
        } finally {
            setUploading(false);
            // Limpiar input file
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative group cursor-pointer w-28 h-28 mx-auto">
            {/* Background glow passthrough */}
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-[35%] blur-xl opacity-40 group-hover:opacity-80 transition duration-700"></div>

            {/* Main Avatar Container */}
            <div
                className="relative w-full h-full rounded-[30%] overflow-hidden shadow-2xl bg-black border border-white/20 transition-transform duration-300 group-hover:scale-105"
                style={frameStyle}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <img
                    src={previewUrl}
                    alt="Avatar"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${uploading ? 'opacity-30 blur-sm' : 'opacity-100 group-hover:opacity-60'}`}
                />

                {/* Hover / Uploading Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    {uploading ? (
                        <span className="text-cyan-400 text-xs font-bold animate-pulse">Subiendo...</span>
                    ) : (
                        <>
                            <span className="text-xl mb-1">📷</span>
                            <span className="text-white text-[10px] font-bold uppercase tracking-wider">Cambiar</span>
                        </>
                    )}
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={handleFileChange}
            />

            {errorMsg && (
                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-48 text-center text-[10px] text-red-400 bg-red-900/30 border border-red-500/50 rounded px-2 py-1 z-30 shadow-lg">
                    {errorMsg}
                </div>
            )}
        </div>
    );
}
