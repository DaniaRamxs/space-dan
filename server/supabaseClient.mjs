/**
 * Supabase client para el servidor Colyseus.
 * Lee las variables del archivo .env en la raíz del proyecto.
 *
 * Variables requeridas (en el .env raíz):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// In production (Railway), variables are directly in process.env.
// dotenv is only needed for local dev.
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("[Supabase Check]", {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_KEY,
    urlValue: SUPABASE_URL ? SUPABASE_URL.substring(0, 15) + "..." : "missing",
    usingViteUrl: !!process.env.VITE_SUPABASE_URL,
    usingViteKey: !!process.env.VITE_SUPABASE_ANON_KEY
});

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[Supabase] ⚠  Variables no encontradas — persistencia desactivada");
}

export const supabase =
    SUPABASE_URL && SUPABASE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

// Create admin client for server-side operations that need to bypass RLS
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
    console.error("=======================================================================");
    console.error("🚨 ALERTA CRÍTICA: SUPABASE_SERVICE_ROLE_KEY NO ESTÁ CONFIGURADA 🚨");
    console.error("El backend no tiene permisos de administrador. Todas las creaciones");
    console.error("de comunidades van a FALLAR con error de RLS (Row-Level Security).");
    console.error("Por favor, añade SUPABASE_SERVICE_ROLE_KEY a tus variables en Railway.");
    console.error("=======================================================================");
}

export const supabaseAdmin = 
    SUPABASE_URL && SERVICE_KEY
        ? createClient(SUPABASE_URL, SERVICE_KEY)
        : supabase; // Fallback to normal client if service key missing

// Helper to create a user-specific client that sends their token, enabling strict RLS checks
export const createClientForUser = (token) => {
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};
