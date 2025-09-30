#!/bin/bash
# Docker entrypoint para Raspberry Pi 5 optimizado

set -e

# Colores para logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[GeneReviews-RPi5] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[GeneReviews-RPi5] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[GeneReviews-RPi5] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[GeneReviews-RPi5] ❌ $1${NC}"
}

# Función para detectar arquitectura
detect_architecture() {
    ARCH=$(uname -m)
    log_info "Detectada arquitectura: $ARCH"
    
    case $ARCH in
        aarch64|arm64)
            log_success "Raspberry Pi 5 (ARM64) detectado correctamente"
            export RPI5_OPTIMIZED=true
            ;;
        armv7l|armv6l)
            log_warning "Raspberry Pi anterior detectado (ARMv7/v6)"
            export RPI5_OPTIMIZED=false
            ;;
        x86_64)
            log_info "Arquitectura x86_64 detectada"
            export RPI5_OPTIMIZED=false
            ;;
        *)
            log_warning "Arquitectura desconocida: $ARCH"
            export RPI5_OPTIMIZED=false
            ;;
    esac
}

# Configurar optimizaciones específicas para RPi5
configure_rpi5_optimizations() {
    if [ "$RPI5_OPTIMIZED" = "true" ]; then
        log_info "Aplicando optimizaciones para Raspberry Pi 5..."
        
        # Configurar Node.js para ARM64
        export NODE_OPTIONS="--max-old-space-size=1024 --gc-interval=100"
        export UV_THREADPOOL_SIZE=4
        
        # Configurar SQLite para ARM64
        export SQLITE_TMPDIR="/tmp"
        export SQLITE_ENABLE_FTS5=1
        
        # Configurar Puppeteer para RPi5
        export PUPPETEER_ARGS="$PUPPETEER_ARGS --disable-background-networking --disable-background-timer-throttling --disable-renderer-backgrounding --disable-features=TranslateUI"
        
        log_success "Optimizaciones ARM64 aplicadas"
    fi
}

# Verificar y crear directorios necesarios
setup_directories() {
    log_info "Configurando directorios..."
    
    # Verificar permisos de escritura
    if [ -w "/usr/src/app/database" ]; then
        log_success "Directorio database accesible"
    else
        log_error "Sin permisos de escritura en directorio database"
        exit 1
    fi
    
    # Crear directorio temporal para cache si no existe
    mkdir -p /tmp/genereviews-cache
    chmod 755 /tmp/genereviews-cache
    
    log_success "Directorios configurados correctamente"
}

# Verificar dependencias del sistema
check_system_dependencies() {
    log_info "Verificando dependencias del sistema..."
    
    # Verificar Node.js
    if node --version >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_success "Node.js disponible: $NODE_VERSION"
    else
        log_error "Node.js no encontrado"
        exit 1
    fi
    
    # Verificar SQLite
    if sqlite3 -version >/dev/null 2>&1; then
        SQLITE_VERSION=$(sqlite3 -version | cut -d' ' -f1)
        log_success "SQLite disponible: $SQLITE_VERSION"
    else
        log_warning "SQLite CLI no disponible, pero sqlite3 module debería funcionar"
    fi
    
    # Verificar Chromium (solo si se va a usar scraping)
    if [ -x "$PUPPETEER_EXECUTABLE_PATH" ]; then
        log_success "Chromium encontrado en $PUPPETEER_EXECUTABLE_PATH"
    else
        log_warning "Chromium no encontrado, scraping podría fallar"
    fi
}

# Inicializar base de datos si no existe
initialize_database() {
    if [ ! -f "/usr/src/app/database/genereviews.db" ]; then
        log_info "Base de datos no existe, será creada al iniciar el servidor"
    else
        log_success "Base de datos existente encontrada"
        
        # Verificar integridad de la base de datos
        if sqlite3 /usr/src/app/database/genereviews.db "PRAGMA integrity_check;" >/dev/null 2>&1; then
            log_success "Base de datos íntegra"
        else
            log_warning "Posible corrupción en base de datos, se recreará"
            rm -f /usr/src/app/database/genereviews.db
        fi
    fi
}

# Configurar memoria para Raspberry Pi
configure_memory() {
    log_info "Configurando gestión de memoria para RPi5..."
    
    # Configurar límites de memoria más conservadores
    export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=512"
    
    # Configurar garbage collection más agresivo
    export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=50"
    
    log_success "Configuración de memoria optimizada"
}

# Función principal de inicio
main() {
    log_info "🧬 Iniciando GeneReviews Database en Raspberry Pi 5"
    echo "================================================================="
    
    # Mostrar información del sistema
    log_info "Sistema: $(uname -a)"
    log_info "Memoria total: $(free -h | grep '^Mem:' | awk '{print $2}')"
    log_info "Espacio libre: $(df -h /usr/src/app | tail -1 | awk '{print $4}')"
    
    # Ejecutar configuraciones
    detect_architecture
    configure_rpi5_optimizations
    configure_memory
    setup_directories
    check_system_dependencies
    initialize_database
    
    log_success "Inicialización completada"
    echo "================================================================="
    
    # Ejecutar comando original
    exec "$@"
}

# Manejo de señales para shutdown limpio
cleanup() {
    log_info "Recibida señal de terminación, limpiando..."
    
    # Limpiar archivos temporales
    rm -rf /tmp/genereviews-cache/* 2>/dev/null || true
    
    log_success "Limpieza completada"
    exit 0
}

# Configurar traps para señales
trap cleanup SIGTERM SIGINT

# Ejecutar función principal
main "$@"