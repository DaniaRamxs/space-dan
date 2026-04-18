/**
 * fix-static-routes.mjs
 *
 * Post-build script para output:export con Capacitor/Tauri.
 *
 * Problema: Las rutas dinámicas (/transmission/[postId], /community/[slug], etc.)
 * solo generan un shell HTML para el placeholder '_'.
 * Cuando el WebView busca /transmission/abc123/index.html → 404.
 *
 * Solución:
 * 1. Para cada ruta dinámica sin index.html propio, copiar _/index.html como
 *    index.html raíz del padre (ej: transmission/index.html) para que Capacitor
 *    sirva el shell para cualquier subruta. El JS de Next.js maneja el routing.
 * 2. Copiar el shell de [username] (/_/index.html) como 404.html global.
 *    Capacitor usa 404.html cuando no encuentra ningún archivo → SPA fallback.
 */

import { copyFileSync, existsSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'out')

// Rutas dinámicas: carpeta en out/ que tiene subcarpeta '_/'
const DYNAMIC_DIRS = [
  'transmission',   // /transmission/[postId]
  'community',      // /community/[slug]
  'game',           // /game/[gameId]
  // 'profile' y 'spaces' tienen su propio index.html (ruta mixta static+dynamic)
  // → su own-page sirve como fallback suficiente
]

// La ruta [username] es la raíz: out/_/index.html → se usa como fallback global
const USERNAME_SHELL = join(OUT, '_', 'index.html')

let fixed = 0

// ─── Fix case collision: Windows NTFS merges Profile/ + profile/ ─────────────
// Pages Router generates /Profile/ProfileRedesign etc. (capital P).
// On Windows (case-insensitive), that directory merges with App Router's
// /profile (lowercase). The directory's canonical name becomes Profile/ (capital)
// which breaks Android's case-sensitive filesystem when Capacitor copies assets.
//
// Solution: two-step rename to force lowercase.
//   Profile/ → profile_RENAME_TEMP/ → profile/
const CASE_FIXES = [
  { from: 'Profile', to: 'profile' },
]

for (const { from, to } of CASE_FIXES) {
  const srcDir  = join(OUT, from)
  const tempDir = join(OUT, `${to}_RENAME_TEMP`)
  const dstDir  = join(OUT, to)
  if (existsSync(srcDir)) {
    try {
      renameSync(srcDir, tempDir)
      renameSync(tempDir, dstDir)
      console.log(`✓ case fix: ${from}/ → ${to}/`)
      fixed++
    } catch (e) {
      console.warn(`⚠️  case fix failed for ${from}/: ${e.message}`)
    }
  }
}

// 1. Copiar shells para rutas dinámicas que NO tienen index.html propio
for (const dir of DYNAMIC_DIRS) {
  const shellSrc = join(OUT, dir, '_', 'index.html')
  const shellDst = join(OUT, dir, 'index.html')

  if (!existsSync(shellSrc)) {
    console.warn(`⚠️  No encontrado shell dinámico: ${shellSrc}`)
    continue
  }

  if (existsSync(shellDst)) {
    // No sobreescribir si ya existe (ej: /profile tiene su propia página)
    console.log(`  ℹ️  ${dir}/index.html ya existe — no se sobreescribe`)
  } else {
    copyFileSync(shellSrc, shellDst)
    console.log(`✓ ${dir}/index.html ← ${dir}/_/index.html (shell dinámico)`)
    fixed++
  }
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
