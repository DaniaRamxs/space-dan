# Dockerfile para Railway — Node.js 20 + Python 3 + yt-dlp
#
# Razón: el servidor de Spacely hace extracción de videos con yt-dlp, que es
# un script Python. Railway's default Node runtime NO tiene Python, por eso
# falla el /api/video/extract con "Internal Server Error".
#
# Este Dockerfile instala Node 20 + Python 3 + yt-dlp actualizado.
# Railway detecta automáticamente el Dockerfile y lo usa para el build.

FROM node:20-slim

# Instalar Python 3 + pip + ffmpeg (para merging de streams si es necesario)
# --no-install-recommends reduce el tamaño del image
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        ca-certificates \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp globalmente via pip (más actualizado que apt)
# --break-system-packages requerido en Debian 12+ (PEP 668)
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Verificar que yt-dlp quedó disponible
RUN yt-dlp --version

# Workdir
WORKDIR /app

# Copiar manifest e instalar deps npm primero (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copiar el resto del código
COPY . .

# Railway provee PORT via env; el server lo lee con process.env.PORT
EXPOSE 2567

# Start
CMD ["node", "index.mjs"]
