/**
 * Shim de compatibilidad: re-exporta el cliente Supabase desde su nueva ubicación.
 * Todos los archivos copiados de space-dan importan desde './supabaseClient'
 * o '../supabaseClient' — este shim hace que sigan funcionando sin modificación.
 */
export { supabase, createClient, isTauri } from './lib/supabase/client'
