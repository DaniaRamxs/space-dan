/**
 * Genera íconos y splash screens para Android en todas las densidades.
 * Uso: node scripts/gen-android-assets.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RES  = join(ROOT, 'android/app/src/main/res');

// ── Configuraciones ───────────────────────────────────────────────────────────

const ICON_SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Foreground del adaptive icon: 108dp × densidad (con margen safe-zone)
const FG_SIZES = [
  { dir: 'mipmap-mdpi',    size: 108 },
  { dir: 'mipmap-hdpi',    size: 162 },
  { dir: 'mipmap-xhdpi',   size: 216 },
  { dir: 'mipmap-xxhdpi',  size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 },
];

const SPLASH_CONFIGS = [
  // Portrait
  { dir: 'drawable-port-mdpi',    w: 320,  h: 480  },
  { dir: 'drawable-port-hdpi',    w: 480,  h: 800  },
  { dir: 'drawable-port-xhdpi',   w: 720,  h: 1280 },
  { dir: 'drawable-port-xxhdpi',  w: 960,  h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  // Landscape
  { dir: 'drawable-land-mdpi',    w: 480,  h: 320  },
  { dir: 'drawable-land-hdpi',    w: 800,  h: 480  },
  { dir: 'drawable-land-xhdpi',   w: 1280, h: 720  },
  { dir: 'drawable-land-xxhdpi',  w: 1600, h: 960  },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function svgToPng(svgBuffer, width, height) {
  const svg = svgBuffer.toString('utf-8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

function save(buffer, dir, filename) {
  const outDir = join(RES, dir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, filename), buffer);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const iconSvg    = readFileSync(join(ROOT, 'resources/icon.svg'));
  const iconFgSvg  = readFileSync(join(ROOT, 'resources/icon-fg.svg'));
  const splashSvg  = readFileSync(join(ROOT, 'resources/splash.svg'));

  console.log('🎨 Generando íconos de lanzador...');
  for (const { dir, size } of ICON_SIZES) {
    const png = svgToPng(iconSvg, size, size);
    save(png, dir, 'ic_launcher.png');
    save(png, dir, 'ic_launcher_round.png');
    console.log(`  ✓ ${dir}: ${size}×${size}`);
  }

  console.log('\n🎨 Generando foreground del adaptive icon...');
  for (const { dir, size } of FG_SIZES) {
    const png = svgToPng(iconFgSvg, size, size);
    save(png, dir, 'ic_launcher_foreground.png');
    console.log(`  ✓ ${dir}: foreground ${size}×${size}`);
  }

  console.log('\n🖼️  Generando splash screens...');
  for (const { dir, w, h } of SPLASH_CONFIGS) {
    // Renderizar a portrait (1080×1920) y recortar / redimensionar
    const png = svgToPng(splashSvg, w, h);
    save(png, dir, 'splash.png');
    console.log(`  ✓ ${dir}: ${w}×${h}`);
  }

  // Splash fallback en drawable/
  const splashFallback = svgToPng(splashSvg, 720, 1280);
  const drawableDir = join(RES, 'drawable');
  mkdirSync(drawableDir, { recursive: true });
  writeFileSync(join(drawableDir, 'splash.png'), splashFallback);
  console.log('  ✓ drawable: splash 720×1280 (fallback)');

  console.log('\n✅ Assets generados correctamente.');
}

run().catch(err => { console.error('❌', err); process.exit(1); });
