#!/bin/bash

# ========================================
# Script de Compilación y Limpieza Docker
# Proyecto: Veo 3.0 Video Generation API
# ========================================

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes con colores
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Función para mostrar el espacio usado antes y después
show_docker_usage() {
    echo -e "\n${BLUE}=== Estado actual de Docker ===${NC}"
    docker system df
}

# Función para verificar si Docker está corriendo
check_docker() {
    log "Verificando Docker..."
    if ! docker info >/dev/null 2>&1; then
        error "Docker no está corriendo. Inicia Docker y vuelve a ejecutar."
        exit 1
    fi
    log "✅ Docker está funcionando correctamente"
}

# Función para detener servicios
stop_services() {
    log "🛑 Deteniendo todos los servicios..."
    if docker compose ps -q | grep -q .; then
        docker compose down
        log "✅ Servicios detenidos correctamente"
    else
        info "No hay servicios corriendo"
    fi
}

# Función para mostrar espacio antes de limpiar
show_space_before() {
    log "📊 Espacio Docker ANTES de la limpieza:"
    show_docker_usage
}

# Función para limpiar imágenes y cache
clean_docker() {
    log "🧹 Iniciando limpieza de Docker..."
    
    # Limpiar imágenes dangling y no utilizadas
    info "Eliminando imágenes sin etiquetas y no utilizadas..."
    IMAGES_REMOVED=$(docker image prune -a -f | grep "Total reclaimed space" | awk '{print $4 $5}' || echo "0B")
    log "✅ Imágenes eliminadas. Espacio liberado: ${IMAGES_REMOVED}"
    
    # Limpiar build cache
    info "Limpiando build cache..."
    CACHE_REMOVED=$(docker builder prune -a -f | grep "Total:" | awk '{print $2}' || echo "0B")
    log "✅ Build cache limpiado. Espacio liberado: ${CACHE_REMOVED}"
    
    # Limpiar contenedores parados (si los hay)
    info "Eliminando contenedores parados..."
    docker container prune -f >/dev/null 2>&1 || true
    
    # Limpiar redes no utilizadas
    info "Eliminando redes no utilizadas..."
    docker network prune -f >/dev/null 2>&1 || true
    
    log "✅ Limpieza de Docker completada"
}

# Función para compilar el proyecto
build_project() {
    log "🏗️ Iniciando compilación del proyecto..."
    
    info "Compilando contenedores sin cache..."
    docker compose build --no-cache
    log "✅ Compilación completada exitosamente"
}

# Función para iniciar servicios
start_services() {
    log "🚀 Iniciando servicios..."
    docker compose up -d
    
    # Esperar un momento para que los servicios se inicien
    info "Esperando que los servicios se inicien completamente..."
    sleep 10
    
    log "✅ Servicios iniciados"
}

# Función para verificar servicios
verify_services() {
    log "🔍 Verificando estado de los servicios..."
    
    # Mostrar estado de contenedores
    echo -e "\n${BLUE}=== Estado de Contenedores ===${NC}"
    docker compose ps
    
    # Verificar API health
    info "Verificando health check de la API..."
    sleep 5  # Dar tiempo adicional para que la API se inicie
    
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8001/health/ >/dev/null 2>&1; then
            log "✅ API respondiendo correctamente"
            
            # Mostrar información de salud
            echo -e "\n${BLUE}=== Health Check API ===${NC}"
            curl -s http://localhost:8001/health/ | jq . || curl -s http://localhost:8001/health/
            break
        else
            warning "Intento $attempt/$max_attempts: API no responde aún, esperando..."
            sleep 5
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "La API no respondió después de $max_attempts intentos"
        return 1
    fi
}

# Función para mostrar espacio después de limpiar
show_space_after() {
    log "📊 Espacio Docker DESPUÉS de la compilación y limpieza:"
    show_docker_usage
}

# Función para mostrar resumen final
show_summary() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}   COMPILACIÓN Y LIMPIEZA COMPLETADA   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    echo -e "\n${BLUE}✅ Tareas completadas:${NC}"
    echo "   • Servicios detenidos correctamente"
    echo "   • Docker limpiado (imágenes + build cache)"
    echo "   • Proyecto recompilado sin cache"
    echo "   • Servicios reiniciados"
    echo "   • Health checks verificados"
    
    echo -e "\n${BLUE}🌐 Servicios disponibles:${NC}"
    echo "   • API:      http://localhost:8001/health/"
    echo "   • API RRSS: http://localhost:8002/docs"
    echo "   • Flower:   http://localhost:5556/"
    echo "   • N8N:      http://localhost:5679/"
    
    echo -e "\n${BLUE}🐳 Contenedores activos:${NC}"
    docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "\n${GREEN}🎉 ¡Proyecto listo para usar!${NC}"
}

# Función principal
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   INICIANDO COMPILACIÓN Y LIMPIEZA   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # Verificar prerequisitos
    check_docker
    
    # Mostrar espacio inicial
    show_space_before
    
    # Ejecutar proceso completo
    stop_services
    clean_docker
    build_project
    start_services
    verify_services
    
    # Mostrar espacio final
    show_space_after
    
    # Resumen
    show_summary
}

# Manejo de errores
trap 'error "❌ Script interrumpido o falló. Revisa los logs anteriores."; exit 1' ERR

# Ejecutar función principal si no se está sourcing el script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
