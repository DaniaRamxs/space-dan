---
description: Cómo actualizar la aplicación Android (APK) y publicarla en la web
---

Cada vez que realices cambios en el código de la web y quieras que se reflejen en la aplicación Android instalada, sigue estos pasos:

### 1. Preparar la Web
Primero, genera la versión de producción de tu web:
```bash
npm run build
```

### 2. Sincronizar con Capacitor
Copia los archivos construidos a la carpeta de Android:
```bash
npx cap sync android
```

### 3. Generar el APK
Tienes dos formas de hacer esto:

#### Opción A: Usando Android Studio (Recomendado)
1. Abre el proyecto en Android Studio: `npx cap open android`.
2. Ve a **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Cuando termine, haz clic en **Locate** en el aviso que aparece abajo a la derecha.

#### Opción B: Usando la Terminal
Ejecuta el siguiente comando para generar un APK de depuración:
```bash
cd android && ./gradlew assembleDebug && cd ..
```

### 4. Publicar para descarga web
Para que los usuarios puedan descargar la nueva versión desde la sección de noticias:
1. Copia el archivo `.apk` generado (normalmente está en `android/app/build/outputs/apk/debug/app-debug.apk`).
2. Pégalo en la carpeta `public/` de tu proyecto web.
3. Cámbiale el nombre a `spacedan.apk` (sobrescribiendo el anterior).

### 5. Subir los cambios
Finalmente, sube el nuevo APK y el código actualizado:
```bash
git add .
git commit -m "chore: update android apk to latest version"
git push
```
