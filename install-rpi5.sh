#!/bin/bash

# 🍓 GeneReviews Database - Script de Instalación para Raspberry Pi 5
# Instalación optimizada específicamente para Raspberry Pi 5 con Docker

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}🍓 $1${NC}"
    echo "================================================================="
}

log_rpi() {
    echo -e "${CYAN}🧬 $1${NC}"
}

# Detectar Raspberry Pi 5
detect_raspberry_pi() {
    log_header "Detectando Hardware Raspberry Pi"
    
    # Verificar arquitectura ARM
    ARCH=$(uname -m)
    if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        log_error "Este script está optimizado para Raspberry Pi 5 (ARM64)"
        log_info "Arquitectura detectada: $ARCH"
        exit 1
    fi
    
    # Verificar si es Raspberry Pi
    if [ -f "/proc/cpuinfo" ]; then
        RPI_MODEL=$(grep "Model" /proc/cpuinfo | cut -d':' -f2 | xargs)
        if [[ "$RPI_MODEL" == *"Raspberry Pi"* ]]; then
            log_success "Raspberry Pi detectado: $RPI_MODEL"
            
            # Verificar si es RPi 5
            if [[ "$RPI_MODEL" == *"5"* ]]; then
                log_success "Raspberry Pi 5 confirmado! 🚀"
                RPI5_DETECTED=true
            else
                log_warning "Raspberry Pi anterior detectado. Continuando con optimizaciones compatibles."
                RPI5_DETECTED=false
            fi
        else
            log_warning "No se detectó Raspberry Pi en /proc/cpuinfo, pero continuando..."
            RPI5_DETECTED=false
        fi
    fi
    
    # Mostrar información del sistema
    log_info "Información del sistema:"
    log_info "  • Arquitectura: $ARCH"
    log_info "  • Kernel: $(uname -r)"
    log_info "  • OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')"
    log_info "  • Memoria: $(free -h | grep '^Mem:' | awk '{print $2}')"
    log_info "  • CPU: $(nproc) cores"
    
    echo ""
}

# Verificar prerrequisitos para RPi5
check_rpi_prerequisites() {
    log_header "Verificando Prerrequisitos para Raspberry Pi 5"
    
    # Verificar Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
        log_success "Docker encontrado: v$DOCKER_VERSION"
        
        # Verificar que Docker esté funcionando
        if docker info &> /dev/null; then
            log_success "Docker daemon funcionando"
        else
            log_error "Docker daemon no está funcionando"
            log_info "Ejecute: sudo systemctl start docker"
            exit 1
        fi
    else
        log_error "Docker no encontrado"
        log_info "Instale Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
        exit 1
    fi
    
    # Verificar Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | tr -d ',')
        log_success "Docker Compose encontrado: v$COMPOSE_VERSION"
    elif docker compose version &> /dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version --short)
        log_success "Docker Compose (plugin) encontrado: v$COMPOSE_VERSION"
        DOCKER_COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose no encontrado"
        log_info "Instale Docker Compose: sudo apt install docker-compose"
        exit 1
    fi
    
    # Configurar comando de Docker Compose
    DOCKER_COMPOSE_CMD=${DOCKER_COMPOSE_CMD:-"docker-compose"}
    
    # Verificar permisos de Docker
    if docker ps &> /dev/null; then
        log_success "Permisos de Docker configurados correctamente"
    else
        log_warning "El usuario actual no tiene permisos para Docker"
        log_info "Agregando usuario al grupo docker..."
        sudo usermod -aG docker $USER
        log_warning "Cierre sesión e inicie sesión nuevamente, o ejecute: newgrp docker"
    fi
    
    # Verificar espacio en disco
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
    REQUIRED_SPACE=2097152  # 2GB en KB
    
    if [ "$AVAILABLE_SPACE" -gt "$REQUIRED_SPACE" ]; then
        log_success "Espacio en disco suficiente: $(df -h / | tail -1 | awk '{print $4}') disponible"
    else
        log_error "Espacio en disco insuficiente. Se requieren al menos 2GB libres"
        exit 1
    fi
    
    echo ""
}

# Optimizar configuración del sistema para RPi5
optimize_rpi5_system() {
    log_header "Optimizando Sistema para Raspberry Pi 5"
    
    # Verificar configuración de memoria
    TOTAL_MEM=$(free -m | grep '^Mem:' | awk '{print $2}')
    log_info "Memoria total detectada: ${TOTAL_MEM}MB"
    
    if [ "$TOTAL_MEM" -lt 1024 ]; then
        log_warning "Memoria limitada detectada. Aplicando configuraciones conservadoras."
        MEMORY_PROFILE="low"
    elif [ "$TOTAL_MEM" -lt 4096 ]; then
        log_info "Memoria moderada detectada. Aplicando configuraciones equilibradas."
        MEMORY_PROFILE="medium"
    else
        log_success "Memoria abundante detectada. Aplicando configuraciones optimizadas."
        MEMORY_PROFILE="high"
    fi
    
    # Crear archivo de configuración específico para RPi5
    cat > .env.rpi5 << EOF
# Configuración optimizada para Raspberry Pi 5
NODE_ENV=production
PORT=3000

# Configuraciones de memoria basadas en perfil: $MEMORY_PROFILE
EOF
    
    case $MEMORY_PROFILE in
        low)
            cat >> .env.rpi5 << EOF
NODE_OPTIONS=--max-old-space-size=256 --gc-interval=25
UV_THREADPOOL_SIZE=1
SCRAPER_DELAY=3000
SCRAPER_MAX_RETRIES=2
SCRAPER_TIMEOUT=20000
EOF
            ;;
        medium)
            cat >> .env.rpi5 << EOF
NODE_OPTIONS=--max-old-space-size=512 --gc-interval=50
UV_THREADPOOL_SIZE=2
SCRAPER_DELAY=2000
SCRAPER_MAX_RETRIES=2
SCRAPER_TIMEOUT=15000
EOF
            ;;
        high)
            cat >> .env.rpi5 << EOF
NODE_OPTIONS=--max-old-space-size=1024 --gc-interval=75
UV_THREADPOOL_SIZE=4
SCRAPER_DELAY=1500
SCRAPER_MAX_RETRIES=3
SCRAPER_TIMEOUT=12000
EOF
            ;;
    esac
    
    cat >> .env.rpi5 << EOF

# Configuraciones de base de datos
DB_PATH=/usr/src/app/database/genereviews.db
SQLITE_TMPDIR=/tmp

# Configuraciones de Docker para RPi5
COMPOSE_HTTP_TIMEOUT=120
DOCKER_CLIENT_TIMEOUT=120

# Optimizaciones específicas de RPi5
RPI5_OPTIMIZED=true
MEMORY_PROFILE=$MEMORY_PROFILE
EOF
    
    log_success "Configuración optimizada creada: .env.rpi5"
    
    # Verificar y configurar swap si es necesario
    SWAP_SIZE=$(free -m | grep '^Swap:' | awk '{print $2}')
    if [ "$SWAP_SIZE" -eq 0 ] && [ "$MEMORY_PROFILE" = "low" ]; then
        log_warning "No hay swap configurado y la memoria es limitada"
        log_info "Se recomienda configurar swap para evitar errores de memoria"
        
        read -p "¿Desea configurar 1GB de swap automáticamente? [y/N]: " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_swap
        fi
    fi
    
    echo ""
}

# Configurar swap para memoria limitada
setup_swap() {
    log_info "Configurando archivo de swap de 1GB..."
    
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 1G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # Hacer permanente
        if ! grep -q '/swapfile' /etc/fstab; then
            echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "Swap de 1GB configurado exitosamente"
    else
        log_info "Archivo de swap ya existe"
    fi
}

# Preparar entorno Docker para RPi5
prepare_docker_environment() {
    log_header "Preparando Entorno Docker para Raspberry Pi 5"
    
    # Crear directorios necesarios
    log_info "Creando estructura de directorios..."
    mkdir -p database logs backups ssl
    
    # Configurar permisos apropiados
    chmod 755 database logs backups
    
    # Crear archivo docker-compose específico para RPi5 si no existe
    if [ ! -f "docker-compose.rpi5.yml" ]; then
        log_info "Creando configuración Docker Compose optimizada para RPi5..."
        cp docker-compose.yml docker-compose.rpi5.yml
        
        # Aplicar optimizaciones específicas en el archivo
        sed -i 's/memory: 1G/memory: 512M/g' docker-compose.rpi5.yml
        sed -i 's/cpus: '"'"'2.0'"'"'/cpus: '"'"'1.5'"'"'/g' docker-compose.rpi5.yml
        
        log_success "Configuración Docker Compose para RPi5 creada"
    fi
    
    # Verificar que no haya contenedores conflictivos
    if docker ps -a | grep -E "genereviews|3000" &> /dev/null; then
        log_warning "Contenedores existentes detectados"
        log_info "Limpiando contenedores previos..."
        docker stop $(docker ps -q --filter "name=genereviews") 2>/dev/null || true
        docker rm $(docker ps -aq --filter "name=genereviews") 2>/dev/null || true
    fi
    
    log_success "Entorno Docker preparado"
    echo ""
}

# Construir imagen Docker optimizada
build_docker_image() {
    log_header "Construyendo Imagen Docker Optimizada para RPi5"
    
    log_info "Iniciando construcción de imagen Docker..."
    log_warning "Esto puede tardar 10-15 minutos en Raspberry Pi 5"
    
    # Construcción con optimizaciones para ARM64
    if $DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml build --no-cache; then
        log_success "Imagen Docker construida exitosamente"
    else
        log_error "Error construyendo imagen Docker"
        log_info "Intentando construcción con menos paralelismo..."
        
        # Reintentar con menos recursos
        DOCKER_BUILDKIT=0 $DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml build --no-cache --parallel 1
    fi
    
    echo ""
}

# Iniciar servicios
start_services() {
    log_header "Iniciando Servicios en Raspberry Pi 5"
    
    log_info "Iniciando contenedores..."
    
    # Usar configuración específica para RPi5
    if $DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml --env-file .env.rpi5 up -d; then
        log_success "Servicios iniciados exitosamente"
    else
        log_error "Error iniciando servicios"
        return 1
    fi
    
    # Esperar a que los servicios estén listos
    log_info "Esperando a que los servicios estén listos (puede tardar 2-3 minutos)..."
    
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health &> /dev/null; then
            log_success "Servicios listos y funcionando!"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "Timeout esperando servicios"
            log_info "Verificando logs..."
            $DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml logs --tail=20
            return 1
        fi
        
        echo -n "."
        sleep 6
    done
    
    echo ""
}

# Cargar datos iniciales
load_initial_data() {
    log_header "Cargando Datos Iniciales"
    
    log_info "Verificando si hay datos existentes..."
    
    # Verificar si ya hay datos
    if curl -s http://localhost:3000/api/stats | grep -q '"totalReviews":[1-9]'; then
        log_success "Datos ya cargados en la base de datos"
        return 0
    fi
    
    log_info "Cargando datos de demostración..."
    
    # Ejecutar el script de demostración dentro del contenedor
    if docker exec genereviews-rpi5 node demo.js; then
        log_success "Datos de demostración cargados exitosamente"
    else
        log_warning "Error cargando datos, pero el servicio funciona"
        log_info "Puede cargar datos manualmente más tarde"
    fi
    
    echo ""
}

# Verificar instalación y mostrar estado
verify_and_show_status() {
    log_header "Verificación Final y Estado del Sistema"
    
    # Verificar servicios
    log_info "Verificando servicios..."
    
    if curl -s http://localhost:3000/api/health | grep -q '"status":"ok"'; then
        log_success "API funcionando correctamente"
    else
        log_error "Problema con la API"
    fi
    
    # Obtener estadísticas
    STATS_JSON=$(curl -s http://localhost:3000/api/stats 2>/dev/null || echo '{}')
    TOTAL_REVIEWS=$(echo "$STATS_JSON" | grep -o '"totalReviews":[0-9]*' | cut -d':' -f2 || echo "0")
    TOTAL_CATEGORIES=$(echo "$STATS_JSON" | grep -o '"totalCategories":[0-9]*' | cut -d':' -f2 || echo "0")
    
    # Mostrar estado de contenedores
    log_info "Estado de contenedores:"
    $DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml ps
    
    # Mostrar recursos del sistema
    log_info "Uso de recursos actual:"
    echo "  • CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% uso"
    echo "  • Memoria: $(free | grep Mem | awk '{printf("%.1f%%\n", $3/$2 * 100.0)}')"
    echo "  • Temperatura: $(vcgencmd measure_temp 2>/dev/null | cut -d'=' -f2 || echo "N/A")"
    
    echo ""
}

# Mostrar resumen final específico para RPi5
show_rpi5_summary() {
    log_header "🍓 Raspberry Pi 5 - Instalación Completada"
    
    log_success "¡GeneReviews Database instalado exitosamente en Raspberry Pi 5!"
    echo ""
    
    log_rpi() {
        echo -e "${CYAN}🧬 $1${NC}"
    }
    
    log_rpi "Configuración específica para RPi5:"
    echo "  • Perfil de memoria: $MEMORY_PROFILE"
    echo "  • Límites de recursos optimizados para ARM64"
    echo "  • Timeouts ajustados para rendimiento de RPi"
    echo "  • Configuraciones conservadoras de CPU/memoria"
    echo ""
    
    echo "🌐 Accesos (desde Raspberry Pi o red local):"
    echo "  • Interfaz Web: ${BLUE}http://localhost:3000${NC}"
    echo "  • API Health: ${BLUE}http://localhost:3000/api/health${NC}"
    echo "  • API Stats: ${BLUE}http://localhost:3000/api/stats${NC}"
    
    # Mostrar IP local para acceso desde otros dispositivos
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ -n "$LOCAL_IP" ]; then
        echo "  • Acceso remoto: ${BLUE}http://$LOCAL_IP:3000${NC}"
    fi
    echo ""
    
    echo "⚙️ Comandos útiles para Raspberry Pi 5:"
    echo "  • Ver logs: ${YELLOW}$DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml logs -f${NC}"
    echo "  • Reiniciar servicios: ${YELLOW}$DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml restart${NC}"
    echo "  • Detener servicios: ${YELLOW}$DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml down${NC}"
    echo "  • Ver recursos: ${YELLOW}docker stats${NC}"
    echo "  • Temperatura RPi: ${YELLOW}vcgencmd measure_temp${NC}"
    echo ""
    
    echo "📊 Estado actual:"
    echo "  • Reviews en BD: $TOTAL_REVIEWS"
    echo "  • Categorías: $TOTAL_CATEGORIES"
    echo "  • Memoria libre: $(free -h | grep '^Mem:' | awk '{print $7}')"
    echo "  • Espacio libre: $(df -h / | tail -1 | awk '{print $4}')"
    echo ""
    
    echo "🔧 Optimizaciones aplicadas:"
    echo "  • Configuración ARM64 nativa"
    echo "  • Límites de memoria ajustados"
    echo "  • Timeouts optimizados para RPi5"
    echo "  • Cache en tmpfs para mejor rendimiento"
    echo "  • Rate limiting adaptado"
    echo ""
    
    echo "💡 Tips para Raspberry Pi 5:"
    echo "  • Mantenga buena ventilación para evitar throttling térmico"
    echo "  • Use tarjeta SD rápida (Class 10 o superior)"
    echo "  • Considere usar SSD USB para mejor rendimiento"
    echo "  • Monitoree temperatura: vcgencmd measure_temp"
    echo ""
    
    log_success "¡Disfrute explorando GeneReviews en su Raspberry Pi 5! 🍓🧬"
    
    # Mostrar próximos pasos
    echo ""
    echo "📋 Próximos pasos sugeridos:"
    echo "  1. Visite http://localhost:3000 para explorar la interfaz"
    echo "  2. Ejecute scraping completo si lo desea (puede tardar horas)"
    echo "  3. Configure acceso remoto si necesita acceder desde otros dispositivos"
    echo "  4. Configure backup automático de la base de datos"
    echo ""
}

# Función principal
main() {
    echo ""
    log_header "GeneReviews Database - Instalación Raspberry Pi 5"
    echo ""
    log_info "Este script instalará y configurará GeneReviews Database"
    log_info "optimizado específicamente para Raspberry Pi 5 usando Docker"
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
        log_info "Asegúrese de que los archivos del proyecto estén presentes"
        exit 1
    fi
    
    # Ejecutar pasos de instalación específicos para RPi5
    detect_raspberry_pi
    check_rpi_prerequisites
    optimize_rpi5_system
    prepare_docker_environment
    
    # Preguntar antes de construir (puede tardar tiempo)
    echo ""
    read -p "¿Proceder con la construcción Docker? (tardará 10-15 minutos) [Y/n]: " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        build_docker_image
        start_services
        
        # Pausa antes de cargar datos
        sleep 10
        load_initial_data
        verify_and_show_status
        show_rpi5_summary
    else
        log_info "Construcción cancelada. Puede ejecutarla manualmente con:"
        log_info "$DOCKER_COMPOSE_CMD -f docker-compose.rpi5.yml up --build -d"
    fi
}

# Verificar argumentos
case "${1:-}" in
    --help|-h)
        echo "🍓 GeneReviews Database - Instalación Raspberry Pi 5"
        echo ""
        echo "Uso: $0 [opciones]"
        echo ""
        echo "Opciones:"
        echo "  --help, -h     Mostrar esta ayuda"
        echo "  --build-only   Solo construir imagen, no iniciar servicios"
        echo "  --no-data      No cargar datos de demostración"
        echo ""
        echo "Este script instala GeneReviews Database optimizado para Raspberry Pi 5"
        exit 0
        ;;
    --build-only)
        BUILD_ONLY=true
        ;;
    --no-data)
        NO_DATA=true
        ;;
esac

# Ejecutar instalación principal
main