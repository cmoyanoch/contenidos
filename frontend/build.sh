#!/bin/bash

echo "🚀 Iniciando compilación del Generador de Contenidos..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar pasos
show_step() {
    echo -e "${YELLOW}📋 $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    show_error "No se encontró package.json. Ejecuta este script desde el directorio frontend."
    exit 1
fi

# Instalar dependencias (usando Docker para evitar problemas de permisos)
show_step "Instalando dependencias con Docker..."
docker compose build --no-cache frontend
if [ $? -ne 0 ]; then
    show_error "Error construyendo imagen Docker"
    exit 1
fi
show_success "Imagen Docker construida"

# Iniciar contenedor
show_step "Iniciando contenedor..."
docker compose up -d frontend
if [ $? -ne 0 ]; then
    show_error "Error iniciando contenedor"
    exit 1
fi
show_success "Contenedor iniciado"

# Verificar que el servicio está funcionando
show_step "Verificando servicio..."
sleep 3
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    show_success "Servicio funcionando correctamente"
else
    echo -e "${YELLOW}⚠️ El servicio puede estar iniciándose aún${NC}"
fi

# Mostrar información final
echo ""
echo -e "${GREEN}🎉 ¡Compilación completada!${NC}"
echo ""
echo "Comandos Docker disponibles:"
echo "  docker compose up -d frontend     - Iniciar en producción"
echo "  docker compose logs frontend      - Ver logs"
echo "  docker compose restart frontend   - Reiniciar"
echo "  docker compose build frontend     - Rebuild"
echo ""
echo "🌐 URLs del proyecto:"
echo "  Frontend:     http://localhost:3000"
echo "  API:          http://localhost:8001"
echo "  pgAdmin:      http://localhost:5050"
echo "  N8N:          http://localhost:5678"
echo "  Flower:       http://localhost:5556"
echo ""

show_success "Frontend listo para usar"
