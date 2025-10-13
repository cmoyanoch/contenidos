#!/bin/bash

# Script para obtener Page ID después de crear la página
# Uso: ./obtener-page-id.sh

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TOKEN="EAAfb1rFlCW4BPmT1hNbtFXtlPfFJV2MTQzdnYZCB7Uh75RU5EIjBQKZBAsaoqUzciOWFDdhUah4nloJazhdmAIeaLssFpHusFekg4dbqoDLHviSHtIPxdSGaeMYZAzUazmORz7qYegwZByR312ZAvtGDHnPMZADdBZAZAkKukJmms3J3WhKC5h0wQUQztVrsZBfsl90kp0s7MudMd7dVcEjZAwB5PiJZCEL9OUl2KNmc2QywGMlZChnhh5e1hNb92AqQwI1WDnFws7H0sf3k"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏢 Obteniendo Páginas de A Security Insurance${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}🔍 Buscando páginas de Facebook asociadas...${NC}"
echo ""

# Obtener páginas de Facebook
PAGES_RESPONSE=$(curl -s "https://graph.facebook.com/v24.0/me/accounts?access_token=$TOKEN")

echo "Respuesta de la API:"
echo "$PAGES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PAGES_RESPONSE"

if echo "$PAGES_RESPONSE" | grep -q '"data"'; then
    DATA_COUNT=$(echo "$PAGES_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    pages = data.get('data', [])
    print(len(pages))
except:
    print('0')
" 2>/dev/null || echo "0")

    if [ "$DATA_COUNT" -gt 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Páginas encontradas: $DATA_COUNT${NC}"
        echo ""
        echo -e "${YELLOW}📋 Páginas disponibles:${NC}"
        echo "$PAGES_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for i, page in enumerate(data.get('data', []), 1):
        print(f'{i}. {page[\"name\"]} (ID: {page[\"id\"]})')
        print(f'   Acceso: {page.get(\"access_token\", \"N/A\")[:20]}...')
        print()
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Error al procesar páginas"

        echo ""
        echo -e "${BLUE}📝 Para configurar tu API RRSS:${NC}"
        echo "1. Copia el ID de la página que quieres usar"
        echo "2. Ejecuta: nano .env"
        echo "3. Reemplaza 'placeholder' con el ID real"
        echo ""
        echo -e "${GREEN}Ejemplo:${NC}"
        echo "FACEBOOK_PAGE_ID=123456789012345"

    else
        echo -e "${YELLOW}⚠️ No se encontraron páginas${NC}"
        echo ""
        echo -e "${BLUE}📋 Para crear una página:${NC}"
        echo "1. Ve a: https://www.facebook.com/pages/create"
        echo "2. Selecciona 'Business or Brand'"
        echo "3. Nombre: 'A Security Insurance'"
        echo "4. Categoría: 'Insurance Company'"
        echo "5. Después ejecuta este script nuevamente"
    fi
else
    echo -e "${RED}❌ Error al obtener páginas${NC}"
    echo ""
    echo -e "${YELLOW}Posibles causas:${NC}"
    echo "• No tienes páginas creadas"
    echo "• Token sin permisos de páginas"
    echo "• Token expirado"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
