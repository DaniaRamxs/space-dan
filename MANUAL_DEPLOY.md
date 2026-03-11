# Emergency: Manual Deploy Instructions
# Vercel no responde a GitHub pushes - solución manual

## PASOS INMEDIATOS:

### 1. Ir a Vercel Dashboard
# https://vercel.com/dashboard

### 2. Buscar proyecto: "space-dan" o "DaniaRamxs/space-dan"

### 3. Hacer Redeploy Manual:
# - Click en el proyecto
# - Tab "Deployments" 
# - Click "Redeploy" 
# - Seleccionar "GitHub" → "main" branch
# - Marcar "Clear cache" si está disponible

### 4. Si no funciona, verificar Build Settings:
# - Settings → Build & Development Settings
# - Build Command: npm run build
# - Output Directory: dist
# - Install Command: npm install

### 5. Último recurso: Reconnect GitHub
# - Settings → Git Integration
# - Disconnect GitHub
# - Reconnect con el repo: DaniaRamxs/space-dan
