#!/bin/bash

# Script para actualizar API RRSS con la app marcia_a
# Uso: ./actualizar-con-marcia-a.sh NUEVO_TOKEN

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar el nuevo token${NC}"
    echo ""
    echo "Uso: ./actualizar-con-marcia-a.sh NUEVO_TOKEN"
    echo ""
    echo "Ejemplo:"
    echo "  ./actualizar-con-marcia-a.sh EAAxxxxxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

NEW_TOKEN="$1"
PAGE_ID="104852996294977"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Actualizando API RRSS con app marcia_a${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📝 Actualizando configuración...${NC}"

# Probar el nuevo token
echo -e "${YELLOW}🔍 Verificando nuevo token...${NC}"
TOKEN_TEST=$(curl -s "https://graph.facebook.com/v24.0/me?fields=id,name&access_token=$NEW_TOKEN")

if echo "$TOKEN_TEST" | grep -q '"id"'; then
    echo -e "${GREEN}✓ Token válido${NC}"

    # Obtener información del usuario
    USER_NAME=$(echo "$TOKEN_TEST" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('name', 'N/A'))
except:
    print('N/A')
" 2>/dev/null || echo "N/A")

    echo "Usuario: $USER_NAME"
else
    echo -e "${RED}❌ Token inválido${NC}"
    exit 1
fi

# Verificar acceso a páginas
echo -e "${YELLOW}🔍 Verificando acceso a páginas...${NC}"
PAGES_TEST=$(curl -s "https://graph.facebook.com/v24.0/me/accounts?access_token=$NEW_TOKEN")

if echo "$PAGES_TEST" | grep -q '"data"'; then
    PAGES_COUNT=$(echo "$PAGES_TEST" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(len(data.get('data', [])))
except:
    print('0')
" 2>/dev/null || echo "0")

    if [ "$PAGES_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Acceso a páginas: $PAGES_COUNT páginas encontradas${NC}"
    else
        echo -e "${YELLOW}⚠️ No se encontraron páginas, pero continuamos${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No se pudo verificar acceso a páginas${NC}"
fi

# Actualizar archivo .env
echo -e "${YELLOW}📝 Actualizando archivo .env...${NC}"
cat > .env << EOF
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=$NEW_TOKEN
INSTAGRAM_ACCOUNT_ID=placeholder

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=$NEW_TOKEN
FACEBOOK_PAGE_ID=$PAGE_ID

# LinkedIn API
LINKEDIN_ACCESS_TOKEN=placeholder
LINKEDIN_PERSON_ID=placeholder

# WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=placeholder
WHATSAPP_PHONE_NUMBER_ID=placeholder
WHATSAPP_BUSINESS_ACCOUNT_ID=placeholder

# Database Configuration
DATABASE_URL=postgresql://postgres:password@db:5432/frontend_db?schema=api_rrss
EOF

echo -e "${GREEN}✓ Archivo .env actualizado${NC}"

# Reiniciar servicio
echo -e "${YELLOW}🔄 Reiniciando servicio API RRSS...${NC}"
cd ..
docker compose restart api_rrss
sleep 3

echo -e "${GREEN}✓ Servicio reiniciado${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Configuración Actualizada${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✅ Configurado con app marcia_a:${NC}"
echo "  • App: marcia_a"
echo "  • Client ID: 53fda3df5a50d3b31c76d6642088df65"
echo "  • Page ID: $PAGE_ID"
echo "  • Token: $NEW_TOKEN (configurado)"
echo "  • API funcionando en puerto 8002"
echo ""

echo -e "${BLUE}🚀 Próximos Pasos:${NC}"
echo "1. Probar publicación en Facebook"
echo "2. Configurar Instagram Business Account"
echo "3. Integrar con N8N para automatización"
echo ""

echo -e "${GREEN}🎉 ¡API RRSS actualizada con marcia_a!${NC}"
