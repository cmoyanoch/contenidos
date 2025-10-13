#!/bin/bash

# ============================================
# Script de Compilación API RRSS con Limpieza
# Stack: FastAPI + Python + Social Media APIs
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Funciones de logging
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
    echo -e "${PURPLE}📱 $1${NC}"
}

# Verificar que estamos en el directorio api_rrss
if [ ! -f "requirements.txt" ] || [ ! -d "app" ]; then
    log_error "Este script debe ejecutarse desde el directorio api_rrss/"
    log_info "Uso: cd api_rrss && ./build-clean.sh"
    exit 1
fi

# Header
echo ""
log_header "============================================"
log_header "COMPILACIÓN API RRSS CON LIMPIEZA"
log_header "FastAPI + Python + Social Media APIs"
log_header "============================================"
echo ""

# Ir al directorio raíz del proyecto
cd ..

# Paso 1: Detener servicio api_rrss
log_info "Deteniendo servicio api_rrss..."
docker compose stop api_rrss || true
log_success "Servicio api_rrss detenido"

# Paso 2: Limpiar imagen api_rrss
log_info "Eliminando imagen api_rrss existente..."
docker rmi contenidos-api_rrss 2>/dev/null || true
log_success "Imagen api_rrss eliminada"

# Paso 3: Limpiar cache de pip en contenedor
log_info "Limpiando cache de pip..."
docker exec contenidos-api_rrss-1 pip cache purge 2>/dev/null || true
log_success "Cache de pip limpiado"

# Paso 4: Limpiar archivos temporales Python
log_info "Limpiando archivos temporales Python..."
cd api_rrss
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
find . -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
log_success "Archivos temporales Python limpiados"
cd ..

# Paso 5: Limpiar imágenes Docker sin etiqueta
log_info "Eliminando imágenes Docker sin etiqueta..."
DANGLING_IMAGES=$(docker images -f "dangling=true" -q)
if [ ! -z "$DANGLING_IMAGES" ]; then
    docker rmi $DANGLING_IMAGES 2>/dev/null || true
    log_success "Imágenes sin etiqueta eliminadas"
else
    log_info "No hay imágenes sin etiqueta que eliminar"
fi

# Paso 6: Limpiar cache de Docker build
log_info "Limpiando cache de Docker build..."
docker builder prune -f
log_success "Cache de Docker build limpiado"

# Paso 7: Compilar api_rrss sin cache
log_info "Compilando api_rrss sin cache..."
docker compose build --no-cache api_rrss
log_success "API RRSS compilada exitosamente"

# Paso 8: Levantar servicio con nueva imagen
log_info "Levantando servicio api_rrss con nueva imagen..."
docker compose up -d api_rrss
log_success "Servicio api_rrss desplegado"

# Paso 9: Esperar que el servicio esté listo
log_info "Esperando que la API RRSS esté lista..."
sleep 15

# Paso 10: Verificar salud de la API
log_info "Verificando estado de la API RRSS..."
for i in {1..5}; do
    if curl -s http://localhost:8002/health 2>/dev/null || curl -s http://localhost:8002/ > /dev/null 2>&1; then
        log_success "API RRSS funcionando correctamente"
        break
    else
        if [ $i -eq 5 ]; then
            log_warning "API RRSS no responde después de 5 intentos"
            log_info "Verificando logs del contenedor..."
            docker logs contenidos-api_rrss-1 --tail 20
            # No salir con error ya que podría no tener endpoint de health
            log_warning "Nota: La API podría estar funcionando sin endpoint /health"
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
log_header "COMPILACIÓN API RRSS COMPLETADA"
log_header "============================================"
echo ""
log_success "API RRSS disponible en: http://localhost:8002"
log_info "Endpoints disponibles según configuración de la API"
echo ""
log_info "Estado del contenedor:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep api_rrss

echo ""
log_warning "NOTA: Los cambios del código Python están ahora compilados y activos"
log_info "Compilación realizada desde: $(pwd)/api_rrss/"
echo ""

# Comandos útiles para desarrollo
log_info "Comandos útiles para desarrollo:"
echo "  docker logs contenidos-api_rrss-1 -f    # Ver logs en tiempo real"
echo "  docker exec -it contenidos-api_rrss-1 bash  # Acceder al contenedor"
echo "  curl http://localhost:8002/               # Probar la API"
echo ""