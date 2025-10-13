#!/bin/bash

# ============================================
# Script de Compilación Frontend con Limpieza Automática
# Debe ejecutarse desde el directorio frontend/
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Función para logging
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
    echo -e "${PURPLE}🧹 $1${NC}"
}

# Verificar que estamos en el directorio frontend
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    log_error "Este script debe ejecutarse desde el directorio frontend/"
    log_info "Uso: cd frontend && ./build-clean.sh"
    exit 1
fi

# Header
echo ""
log_header "============================================"
log_header "COMPILACIÓN FRONTEND CON LIMPIEZA"
log_header "============================================"
echo ""

# Ir al directorio raíz del proyecto
cd ..

# Paso 1: Limpiar imágenes Docker sin etiqueta
log_info "Eliminando imágenes Docker sin etiqueta (dangling)..."
DANGLING_IMAGES=$(docker images -f "dangling=true" -q)
if [ ! -z "$DANGLING_IMAGES" ]; then
    docker rmi $DANGLING_IMAGES 2>/dev/null || true
    log_success "Imágenes sin etiqueta eliminadas"
else
    log_info "No hay imágenes sin etiqueta que eliminar"
fi

# Paso 2: Limpiar cache de Docker build
log_info "Limpiando cache de Docker build..."
docker builder prune -f
log_success "Cache de Docker build limpiado"

# Paso 3: Limpiar cache de Next.js en contenedor (si existe)
log_info "Limpiando cache de Next.js en contenedor..."
docker exec contenidos-frontend-1 rm -rf .next/cache .next/static .next/server 2>/dev/null || true
log_success "Cache de Next.js limpiado"

# Paso 4: Detener contenedor frontend actual
log_info "Deteniendo contenedor frontend actual..."
docker compose stop frontend
log_success "Contenedor frontend detenido"

# Paso 5: Eliminar imagen frontend actual (marcadas para limpieza)
log_info "Eliminando imagen frontend actual..."
docker rmi contenidos-frontend 2>/dev/null || true
# También eliminar imágenes marcadas para limpieza
CLEANUP_IMAGES=$(docker images --filter "label=cleanup.image=true" -q 2>/dev/null || true)
if [ ! -z "$CLEANUP_IMAGES" ]; then
    docker rmi $CLEANUP_IMAGES 2>/dev/null || true
    log_success "Imágenes marcadas para limpieza eliminadas"
fi

# Paso 6: Limpiar cache local de Next.js
log_info "Limpiando cache local de Next.js..."
cd frontend
rm -rf .next node_modules/.cache 2>/dev/null || true
log_success "Cache local de Next.js limpiado"
cd ..

# Paso 7: Compilar frontend sin cache
log_info "Compilando frontend sin cache..."
docker compose build --no-cache frontend
log_success "Frontend compilado exitosamente"

# Paso 8: Levantar frontend con nueva imagen
log_info "Levantando frontend con nueva imagen..."
docker compose up -d frontend
log_success "Frontend desplegado"

# Paso 9: Esperar que el servicio esté listo
log_info "Esperando que el frontend esté listo..."
sleep 15

# Paso 10: Verificar que el frontend esté funcionando
log_info "Verificando estado del frontend..."
for i in {1..5}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend funcionando correctamente"
        break
    else
        if [ $i -eq 5 ]; then
            log_error "Frontend no responde después de 5 intentos"
            log_info "Verificando logs del contenedor..."
            docker logs contenidos-frontend-1 --tail 20
            exit 1
        else
            log_warning "Intento $i/5 - Esperando 5 segundos más..."
            sleep 5
        fi
    fi
done

# Paso 11: Limpieza final
log_info "Limpieza final de Docker..."
docker system prune -f > /dev/null 2>&1
log_success "Limpieza final completada"

# Resumen final
echo ""
log_header "============================================"
log_header "COMPILACIÓN COMPLETADA CON ÉXITO"
log_header "============================================"
echo ""
log_success "Frontend disponible en: http://localhost:3000"
log_success "Generar videos en: http://localhost:3000/generar-video"
echo ""
log_info "Estado de contenedores:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep frontend

echo ""
log_warning "NOTA: Los cambios del código están ahora compilados y activos"
log_info "Compilación realizada desde: $(pwd)/frontend/"
echo ""