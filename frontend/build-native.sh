#!/bin/bash

# Build Script for Spacely Native Apps
# This script builds Tauri (desktop) and Capacitor (mobile) apps

echo "🚀 Building Spacely Native Apps..."

echo ""
echo "📱 Step 1: Building Web App..."
npm run build

echo ""
echo "🖥️  Step 2: Building Tauri Desktop App..."
npm run tauri:build

echo ""
echo "📲 Step 3: Syncing Capacitor Mobile App..."
npm run cap:sync

echo ""
echo "✅ Build Complete!"
echo ""
echo "📦 Generated Files:"
echo "🖥️  Desktop: src-tauri/target/release/bundle/"
echo "   - MSI Installer: Spacely_0.0.0_x64_en-US.msi"
echo "   - NSIS Installer: Spacely_0.0.0_x64-setup.exe"
echo "   - Portable: spacely.exe"
echo ""
echo "📱 Mobile: android/app/build/outputs/"
echo "   - APK: app-release.apk"
echo "   - Bundle: app-release.aab"
echo ""
echo "🎯 Next Steps:"
echo "1. Test desktop installers"
echo "2. Open Android Studio: npm run cap:android"
echo "3. Build signed APK/AAB for distribution"
echo "4. Upload to app stores"
