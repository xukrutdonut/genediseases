#!/bin/bash

# 🧬 GeneReviews Database - Script de Instalación Automatizada
# Instala y configura la aplicación completa de base de datos de GeneReviews

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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
    echo -e "${PURPLE}🧬 $1${NC}"
    echo "================================================================="
}

# Verificar prerrequisitos
check_prerequisites() {
    log_header "Verificando Prerrequisitos"
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js encontrado: $NODE_VERSION"
        
        # Verificar versión mínima (v14)
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
            log_error "Node.js v14+ requerido. Versión actual: $NODE_VERSION"
            exit 1
        fi
    else
        log_error "Node.js no encontrado. Por favor instale Node.js v14 o superior"
        log_info "Visite: https://nodejs.org/"
        exit 1
    fi
    
    # Verificar npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm encontrado: v$NPM_VERSION"
    else
        log_error "npm no encontrado"
        exit 1
    fi
    
    # Verificar curl (opcional pero útil)
    if command -v curl &> /dev/null; then
        log_success "curl encontrado"
    else
        log_warning "curl no encontrado (recomendado para testing)"
    fi
    
    echo ""
}

# Instalar dependencias
install_dependencies() {
    log_header "Instalando Dependencias"
    
    if [ -f "package.json" ]; then
        log_info "Instalando dependencias de Node.js..."
        npm install
        log_success "Dependencias instaladas correctamente"
    else
        log_error "package.json no encontrado. ¿Está ejecutando este script desde el directorio correcto?"
        exit 1
    fi
    
    echo ""
}

# Configurar aplicación
configure_app() {
    log_header "Configurando Aplicación"
    
    # Crear archivo .env si no existe
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "Creando archivo de configuración .env..."
            cp .env.example .env
            log_success "Archivo .env creado desde .env.example"
        else
            log_info "Creando archivo .env básico..."
            cat > .env << EOF
PORT=3000
NODE_ENV=development
DB_PATH=./database/genereviews.db
SCRAPER_DELAY=1000
SCRAPER_MAX_RETRIES=3
EOF
            log_success "Archivo .env creado con configuración básica"
        fi
    else
        log_info "Archivo .env ya existe, manteniéndolo"
    fi
    
    # Crear directorios necesarios
    log_info "Creando directorios necesarios..."
    mkdir -p database logs
    log_success "Directorios creados"
    
    echo ""
}

# Ejecutar scraping inicial
run_initial_scraping() {
    log_header "Ejecutando Web Scraping Inicial"
    
    log_info "Extrayendo datos de GeneReviews (esto puede tomar unos minutos)..."
    log_warning "El scraper está configurado para ser respetuoso con los servidores de NCBI"
    
    if node scraper/genereviews-scraper.js; then
        log_success "Scraping completado exitosamente"
    else
        log_warning "El scraping falló, pero la aplicación puede funcionar con datos de ejemplo"
        log_info "Puede ejecutar manualmente: npm run scrape"
    fi
    
    echo ""
}

# Iniciar servidor
start_server() {
    log_header "Iniciando Servidor"
    
    log_info "Iniciando servidor en segundo plano..."
    
    # Matar proceso existente en puerto 3000 si existe
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        log_warning "Matando proceso existente en puerto 3000..."
        kill -9 $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null || true
        sleep 2
    fi
    
    # Iniciar servidor en segundo plano
    node backend/server.js &
    SERVER_PID=$!
    
    log_info "Esperando a que el servidor inicie..."
    sleep 5
    
    # Verificar que el servidor esté funcionando
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "Servidor iniciado correctamente (PID: $SERVER_PID)"
        echo $SERVER_PID > .server_pid
    else
        log_error "Error iniciando el servidor"
        return 1
    fi
    
    echo ""
}

# Cargar datos iniciales
load_initial_data() {
    log_header "Cargando Datos Iniciales"
    
    log_info "Cargando datos en la base de datos..."
    
    # Esperar un poco más para asegurar que el servidor esté listo
    sleep 3
    
    if curl -s -X POST http://localhost:3000/api/admin/load-data >/dev/null 2>&1; then
        log_success "Datos cargados exitosamente"
    else
        log_warning "Error cargando datos iniciales, pero el servidor está funcionando"
        log_info "Puede cargar datos manualmente ejecutando: curl -X POST http://localhost:3000/api/admin/load-data"
    fi
    
    echo ""
}

# Verificar instalación
verify_installation() {
    log_header "Verificando Instalación"
    
    # Verificar API
    log_info "Verificando endpoints de la API..."
    
    if HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health); then
        if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
            log_success "API funcionando correctamente"
        else
            log_warning "API responde pero con estado inesperado"
        fi
    else
        log_error "API no responde"
        return 1
    fi
    
    # Verificar estadísticas
    if STATS_RESPONSE=$(curl -s http://localhost:3000/api/stats); then
        REVIEW_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"totalReviews":[0-9]*' | cut -d':' -f2 || echo "0")
        CATEGORY_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"totalCategories":[0-9]*' | cut -d':' -f2 || echo "0")
        
        log_success "Base de datos operativa:"
        log_info "  • Reviews: $REVIEW_COUNT"
        log_info "  • Categorías: $CATEGORY_COUNT"
    else
        log_warning "No se pudieron obtener estadísticas"
    fi
    
    # Verificar interfaz web
    if curl -s -I http://localhost:3000/ | head -1 | grep -q "200 OK"; then
        log_success "Interfaz web accesible"
    else
        log_warning "Problema accediendo a la interfaz web"
    fi
    
    echo ""
}

# Mostrar resumen final
show_summary() {
    log_header "Instalación Completada"
    
    log_success "¡GeneReviews Database instalado exitosamente!"
    echo ""
    echo "🌐 Accesos:"
    echo "  • Interfaz Web: ${BLUE}http://localhost:3000${NC}"
    echo "  • API Health: ${BLUE}http://localhost:3000/api/health${NC}"
    echo "  • API Stats: ${BLUE}http://localhost:3000/api/stats${NC}"
    echo ""
    echo "⚙️ Comandos útiles:"
    echo "  • Detener servidor: ${YELLOW}kill \$(cat .server_pid)${NC}"
    echo "  • Reiniciar servidor: ${YELLOW}npm start${NC}"
    echo "  • Ejecutar scraping: ${YELLOW}npm run scrape${NC}"
    echo "  • Ver logs: ${YELLOW}tail -f logs/app.log${NC}"
    echo ""
    echo "📖 Documentación:"
    echo "  • README.md - Documentación completa"
    echo "  • INSTALL.md - Guía de instalación detallada"
    echo ""
    echo "🔍 Ejemplos de búsqueda:"
    echo "  • ${YELLOW}curl \"http://localhost:3000/api/search?q=cystic\"${NC}"
    echo "  • ${YELLOW}curl \"http://localhost:3000/api/categories\"${NC}"
    echo "  • ${YELLOW}curl \"http://localhost:3000/api/reviews\"${NC}"
    echo ""
    
    # Verificar si hay PID del servidor guardado
    if [ -f ".server_pid" ]; then
        SERVER_PID=$(cat .server_pid)
        log_info "Servidor ejecutándose con PID: $SERVER_PID"
        log_warning "Para detener el servidor ejecute: kill $SERVER_PID"
    fi
    
    echo ""
    log_success "¡Disfrute explorando la base de datos de GeneReviews! 🧬"
}

# Función de cleanup para errores
cleanup_on_error() {
    log_error "Error durante la instalación"
    
    if [ -f ".server_pid" ]; then
        SERVER_PID=$(cat .server_pid)
        log_info "Deteniendo servidor (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        rm -f .server_pid
    fi
    
    exit 1
}

# Configurar trap para cleanup
trap cleanup_on_error ERR

# Función principal
main() {
    echo ""
    log_header "GeneReviews Database - Instalación Automatizada"
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "scraper" ]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
        log_info "Asegúrese de que los archivos del proyecto estén presentes"
        exit 1
    fi
    
    # Ejecutar pasos de instalación
    check_prerequisites
    install_dependencies
    configure_app
    
    # Preguntar si ejecutar scraping
    echo ""
    read -p "¿Desea ejecutar el web scraping inicial? (puede tardar varios minutos) [y/N]: " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_initial_scraping
    else
        log_info "Saltando scraping inicial. Puede ejecutarlo después con: npm run scrape"
        echo ""
    fi
    
    start_server
    load_initial_data
    verify_installation
    show_summary
}

# Verificar argumentos de línea de comandos
case "${1:-}" in
    --help|-h)
        echo "🧬 GeneReviews Database - Script de Instalación"
        echo ""
        echo "Uso: $0 [opciones]"
        echo ""
        echo "Opciones:"
        echo "  --help, -h     Mostrar esta ayuda"
        echo "  --quiet, -q    Instalación silenciosa"
        echo "  --no-scraping  Saltar scraping inicial"
        echo ""
        echo "Este script instala y configura automáticamente la aplicación completa."
        exit 0
        ;;
    --quiet|-q)
        log_info "Modo silencioso activado"
        exec > /dev/null 2>&1
        ;;
    --no-scraping)
        SKIP_SCRAPING=true
        ;;
esac

# Ejecutar instalación principal
main