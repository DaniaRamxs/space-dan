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

// Apunta al .env de la raíz del monorepo (un nivel arriba de /server)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Accept both VITE_-prefixed (local dev) and plain names (Railway/production)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[Supabase] ⚠  Variables no encontradas — persistencia desactivada");
}

export const supabase =
    SUPABASE_URL && SUPABASE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;
