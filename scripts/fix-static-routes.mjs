/**
 * fix-static-routes.mjs
 *
 * Post-build script para output:export con Capacitor/Tauri.
 *
 * Problema: Las rutas dinámicas (/transmission/[postId], /community/[slug], etc.)
 * solo generan un shell HTML para el placeholder '_'.
 * Cuando el WebView busca /transmission/abc123/index.html → 404.
 *
 * Solución: Para cada ruta dinámica, copiar _/index.html como la raíz de la
 * carpeta padre (p.ej. transmission/index.html) así Capacitor sirve el shell
 * para cualquier subruta. El JS de Next.js maneja el routing real en cliente.
 *
 * También copia out/404.html y out/_/index.html a la raíz como fallback global.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'out')

// Rutas dinámicas: carpeta en out/ que tiene subcarpeta '_/'
const DYNAMIC_DIRS = [
  'transmission',   // /transmission/[postId]
  'community',      // /community/[slug]
  'profile',        // /profile/[userId]
  'game',           // /game/[gameId]
  'spaces',         // /spaces/[spaceId]
]

// La ruta [username] es la raíz: out/_/index.html → se usa como fallback global
const USERNAME_SHELL = join(OUT, '_', 'index.html')

let fixed = 0

// 1. Para cada ruta dinámica con prefijo, copiar shell al nivel del prefijo
//    out/transmission/_/index.html → out/transmission/index.html
//    Así /transmission/cualquier-cosa → carga transmission/index.html → JS resuelve
for (const dir of DYNAMIC_DIRS) {
  const shellSrc = join(OUT, dir, '_', 'index.html')
  const shellDst = join(OUT, dir, 'index.html')

  if (!existsSync(shellSrc)) {
    console.warn(`⚠️  No encontrado: ${shellSrc}`)
    continue
  }

  copyFileSync(shellSrc, shellDst)
  console.log(`✓ ${dir}/index.html (fallback para /${dir}/**)`)
  fixed++
}

// 2. Copiar el shell de [username] como 404.html global
//    Capacitor usa 404.html cuando no encuentra ningún archivo
if (existsSync(USERNAME_SHELL)) {
  copyFileSync(USERNAME_SHELL, join(OUT, '404.html'))
  console.log(`✓ 404.html (fallback global para /username y rutas desconocidas)`)
  fixed++
} else {
  console.warn(`⚠️  No encontrado shell de [username]: ${USERNAME_SHELL}`)
}

console.log(`\n✅ fix-static-routes: ${fixed} archivos copiados`)
