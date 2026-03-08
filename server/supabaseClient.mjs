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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("[Supabase Check]", {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_KEY,
    urlValue: SUPABASE_URL ? SUPABASE_URL.substring(0, 15) + "..." : "missing"
});

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[Supabase] ⚠  Variables no encontradas — persistencia desactivada");
}

export const supabase =
    SUPABASE_URL && SUPABASE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;
