#!/bin/bash

# ============================================
# Script de Compilación Frontend - Wrapper
# Ejecuta el script principal desde frontend/
# ============================================

set -e

# Colores para output
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Ejecutando script de compilación frontend...${NC}"
echo -e "${YELLOW}⚠️  Nota: El script principal está en frontend/build-clean.sh${NC}"
echo ""

# Verificar que el script existe
if [ ! -f "frontend/build-clean.sh" ]; then
    echo -e "${RED}❌ Error: No se encontró frontend/build-clean.sh${NC}"
    exit 1
fi

# Ejecutar el script principal desde frontend
cd frontend && ./build-clean.sh