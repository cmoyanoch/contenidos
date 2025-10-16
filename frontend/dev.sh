#!/bin/bash

echo "🚀 Iniciando Generador de Contenidos en modo desarrollo..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_step() {
    echo -e "${YELLOW}📋 $1${NC}"
}

show_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ No se encontró package.json. Ejecuta este script desde el directorio frontend.${NC}"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    show_step "Instalando dependencias..."
    npm install
    show_success "Dependencias instaladas"
else
    show_info "Dependencias ya instaladas"
fi

# Generar cliente de Prisma
show_step "Generando cliente de Prisma..."
npx prisma generate --schema=./prisma/schema.prisma
show_success "Cliente de Prisma generado"

# Mostrar información
echo ""
echo -e "${GREEN}🎉 ¡Generador de Contenidos listo para desarrollo!${NC}"
echo ""
echo "🌐 URLs disponibles:"
echo "  Frontend:     http://localhost:3000"
echo "  API:          http://localhost:8001"
echo "  pgAdmin:      http://localhost:5050"
echo "  N8N:          http://localhost:5678"
echo ""
echo "📝 Comandos útiles:"
echo "  npm run dev     - Modo desarrollo (hot reload)"
echo "  npm run build   - Compilar para producción"
echo "  npm run start   - Ejecutar versión de producción"
echo "  npm run lint    - Verificar código"
echo ""

# Iniciar en modo desarrollo
show_step "Iniciando servidor de desarrollo..."
show_info "Presiona Ctrl+C para detener el servidor"
echo ""

npm run dev
