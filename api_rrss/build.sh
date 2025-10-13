#!/bin/bash

# ========================================
# Script de Compilación API RRSS
# Proyecto: ContentFlow API Social Media
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

# Función para verificar si Docker está corriendo
check_docker() {
    log "Verificando Docker..."
    if ! docker info >/dev/null 2>&1; then
        error "Docker no está corriendo. Inicia Docker y vuelve a ejecutar."
        exit 1
    fi
    log "✅ Docker está funcionando correctamente"
}

# Función para verificar archivos requeridos
check_requirements() {
    log "🔍 Verificando archivos requeridos..."

    if [ ! -f "Dockerfile" ]; then
        error "Dockerfile no encontrado"
        exit 1
    fi

    if [ ! -f "requirements.txt" ]; then
        error "requirements.txt no encontrado"
        exit 1
    fi

    if [ ! -f ".env" ]; then
        warning ".env no encontrado, usando .env.example"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            info "✅ .env creado desde .env.example"
        else
            error ".env.example tampoco existe"
            exit 1
        fi
    fi

    log "✅ Archivos requeridos verificados"
}

# Función para detener el servicio
stop_service() {
    log "🛑 Deteniendo servicio API RRSS..."
    if docker ps | grep -q "contenidos-api_rrss-1\|api_rrss"; then
        docker compose stop api_rrss 2>/dev/null || docker stop contenidos-api_rrss-1 2>/dev/null || true
        log "✅ Servicio detenido"
    else
        info "Servicio no estaba corriendo"
    fi
}

# Función para limpiar imagen anterior
clean_image() {
    log "🧹 Limpiando imagen anterior..."
    docker image rm contenidos-api_rrss 2>/dev/null || true
    docker image prune -f >/dev/null 2>&1 || true
    log "✅ Limpieza completada"
}

# Función para compilar
build_service() {
    log "🏗️ Compilando API RRSS..."
    docker compose build --no-cache api_rrss
    log "✅ Compilación completada"
}

# Función para iniciar servicio
start_service() {
    log "🚀 Iniciando servicio API RRSS..."
    docker compose up -d api_rrss

    # Esperar que el servicio se inicie
    info "Esperando que el servicio se inicie..."
    sleep 10
    log "✅ Servicio iniciado"
}

# Función para verificar el servicio
verify_service() {
    log "🔍 Verificando servicio API RRSS..."

    local max_attempts=6
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8002/docs >/dev/null 2>&1; then
            log "✅ API RRSS respondiendo correctamente"

            echo -e "\n${BLUE}=== API RRSS Docs ===${NC}"
            echo "📖 Documentación disponible en: http://localhost:8002/docs"
            break
        else
            warning "Intento $attempt/$max_attempts: API RRSS no responde aún, esperando..."
            sleep 5
            ((attempt++))
        fi
    done

    if [ $attempt -gt $max_attempts ]; then
        error "La API RRSS no respondió después de $max_attempts intentos"
        echo -e "\n${YELLOW}Verificando logs del contenedor:${NC}"
        docker compose logs api_rrss --tail 20
        return 1
    fi
}

# Función para mostrar resumen
show_summary() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}    API RRSS COMPILADA EXITOSAMENTE    ${NC}"
    echo -e "${GREEN}========================================${NC}"

    echo -e "\n${BLUE}✅ Tareas completadas:${NC}"
    echo "   • Servicio detenido"
    echo "   • Imagen anterior limpiada"
    echo "   • Proyecto recompilado sin cache"
    echo "   • Servicio reiniciado"
    echo "   • Health check verificado"

    echo -e "\n${BLUE}🌐 Servicio disponible:${NC}"
    echo "   • API RRSS: http://localhost:8002/docs"

    echo -e "\n${BLUE}🐳 Estado del contenedor:${NC}"
    docker compose ps api_rrss

    echo -e "\n${GREEN}🎉 ¡API RRSS lista para usar!${NC}"
}

# Función principal
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}     COMPILANDO API RRSS (FASTAPI)     ${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Cambiar al directorio del proyecto
    cd "$(dirname "$0")"

    # Verificar prerequisitos
    check_docker
    check_requirements

    # Ejecutar proceso de compilación
    stop_service
    clean_image
    build_service
    start_service
    verify_service

    # Mostrar resumen
    show_summary
}

# Manejo de errores
trap 'error "❌ Script interrumpido o falló. Revisa los logs anteriores."; exit 1' ERR

# Ejecutar función principal
main "$@"