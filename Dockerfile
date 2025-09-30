# Base de datos GeneReviews - Dockerfile optimizado para Raspberry Pi 5
FROM node:18-alpine

# Metadata
LABEL maintainer="GeneReviews Database Project"
LABEL description="Base de datos explorable de GeneReviews optimizada para Raspberry Pi 5"
LABEL version="1.0.0"

# Variables de entorno para optimización ARM64
ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_CACHE=/tmp/.npm \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --no-first-run --no-zygote --single-process"

# Crear directorio de aplicación
WORKDIR /usr/src/app

# Instalar dependencias del sistema optimizadas para ARM64
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    bash \
    sqlite \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S genereviews -u 1001 -G nodejs

# Copiar archivos de configuración de npm
COPY package*.json ./

# Instalar dependencias de Node.js con optimizaciones para ARM
RUN npm ci --only=production --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /tmp/.npm

# Copiar código fuente
COPY --chown=genereviews:nodejs . .

# Crear directorios necesarios con permisos correctos
RUN mkdir -p database logs /tmp/scraper-cache \
    && chown -R genereviews:nodejs /usr/src/app \
    && chmod -R 755 /usr/src/app \
    && chmod +x install.sh

# Cambiar a usuario no-root
USER genereviews

# Health check optimizado
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Exponer puerto
EXPOSE 3000

# Script de inicio con verificación de arquitectura
COPY docker-entrypoint.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER genereviews

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]