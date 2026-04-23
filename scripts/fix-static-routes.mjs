/**
 * fix-static-routes.mjs
 *
 * Post-build script para output:export con Capacitor/Tauri.
 *
 * Estrategia SPA pura (último recurso — replica modelo Vite):
 * ─────────────────────────────────────────────────────────
 * Capacitor WebView no maneja bien los múltiples HTMLs de Next App Router
 * (RSC fetch falla, client router se confunde con placeholders).
 *
 * Solución: sobrescribir cada index.html de subruta con el index.html raíz
 * que carga HomePageClient. HomePageClient actúa como router manual:
 * detecta pathname y renderiza el componente lazy correspondiente dentro
 * del GardenLayout.
 *
 * Pasos:
 *   1. Case-fix Profile/ → profile/ (Windows NTFS)
 *   2. Sobrescribir out/*\/index.html con out/index.html
 *   3. Copiar out/index.html como 404.html (SPA fallback)
 */

import { copyFileSync, existsSync, renameSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'out')
const ROOT_INDEX = join(OUT, 'index.html')

// Top-level dirs que NO se deben tocar (Next assets)
const KEEP_TOP_LEVEL = new Set(['_next', '_not-found'])

let fixed = 0

// ─── 1. Fix case collision Profile/ → profile/ (Windows NTFS) ────────────────
const CASE_FIXES = [{ from: 'Profile', to: 'profile' }]
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

// ─── 2. Sobrescribir cada index.html con el root ────────────────────────────
if (!existsSync(ROOT_INDEX)) {
  console.error(`❌ No encontrado: ${ROOT_INDEX}`)
  process.exit(1)
}

function walkAndOverwrite(dir, depth = 0) {
  let entries
  try { entries = readdirSync(dir) } catch { return }
  for (const entry of entries) {
    const full = join(dir, entry)
    let st
    try { st = statSync(full) } catch { continue }
    if (!st.isDirectory()) continue
    if (depth === 0 && KEEP_TOP_LEVEL.has(entry)) continue

    // Sobrescribir el index.html de este directorio si existe
    const indexFile = join(full, 'index.html')
    if (existsSync(indexFile)) {
      copyFileSync(ROOT_INDEX, indexFile)
      fixed++
    }

    walkAndOverwrite(full, depth + 1)
  }
}

walkAndOverwrite(OUT)
console.log(`✓ SPA shell aplicado a ${fixed - CASE_FIXES.length} subrutas`)

// ─── 3. 404.html como fallback SPA ─────────────────────────────────────────
copyFileSync(ROOT_INDEX, join(OUT, '404.html'))
console.log(`✓ 404.html ← root index.html (SPA fallback)`)
fixed++

console.log(`\n✅ fix-static-routes: ${fixed} archivos procesados`)
