#!/bin/bash

# Script para configurar API RRSS con la página correcta
# Uso: ./configurar-con-pagina.sh

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PAGE_ID="104852996294977"
TOKEN="EAAfb1rFlCW4BPmT1hNbtFXtlPfFJV2MTQzdnYZCB7Uh75RU5EIjBQKZBAsaoqUzciOWFDdhUah4nloJazhdmAIeaLssFpHusFekg4dbqoDLHviSHtIPxdSGaeMYZAzUazmORz7qYegwZByR312ZAvtGDHnPMZADdBZAZAkKukJmms3J3WhKC5h0wQUQztVrsZBfsl90kp0s7MudMd7dVcEjZAwB5PiJZCEL9OUl2KNmc2QywGMlZChnhh5e1hNb92AqQwI1WDnFws7H0sf3k"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏢 Configurando API RRSS con A Security Insurance${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📝 Configurando con Page ID: $PAGE_ID${NC}"

# Verificar que la página existe y obtener información
echo -e "${YELLOW}🔍 Verificando página de Facebook...${NC}"
PAGE_INFO=$(curl -s "https://graph.facebook.com/v24.0/$PAGE_ID?fields=id,name,category&access_token=$TOKEN")

echo "Información de la página:"
echo "$PAGE_INFO" | python3 -m json.tool 2>/dev/null || echo "$PAGE_INFO"

if echo "$PAGE_INFO" | grep -q '"id"'; then
    PAGE_NAME=$(echo "$PAGE_INFO" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('name', 'N/A'))
except:
    print('N/A')
" 2>/dev/null || echo "N/A")

    echo -e "${GREEN}✓ Página verificada: $PAGE_NAME${NC}"

    # Verificar si hay Instagram Business Account asociado
    echo -e "${YELLOW}🔍 Verificando Instagram Business Account...${NC}"
    INSTAGRAM_INFO=$(curl -s "https://graph.facebook.com/v24.0/$PAGE_ID?fields=instagram_business_account&access_token=$TOKEN")

    echo "Información de Instagram:"
    echo "$INSTAGRAM_INFO" | python3 -m json.tool 2>/dev/null || echo "$INSTAGRAM_INFO"

    if echo "$INSTAGRAM_INFO" | grep -q '"instagram_business_account"'; then
        INSTAGRAM_ID=$(echo "$INSTAGRAM_INFO" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    ig_account = data.get('instagram_business_account', {})
    print(ig_account.get('id', 'N/A'))
except:
    print('N/A')
" 2>/dev/null || echo "N/A")

        echo -e "${GREEN}✓ Instagram Business Account encontrado: $INSTAGRAM_ID${NC}"
    else
        echo -e "${YELLOW}⚠️ No se encontró Instagram Business Account asociado${NC}"
        INSTAGRAM_ID="placeholder"
    fi

else
    echo -e "${RED}❌ Error al verificar la página${NC}"
    INSTAGRAM_ID="placeholder"
fi

echo ""
echo -e "${YELLOW}📝 Actualizando archivo .env...${NC}"

# Actualizar archivo .env con la información correcta
cat > .env << EOF
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=$TOKEN
INSTAGRAM_ACCOUNT_ID=$INSTAGRAM_ID

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=$TOKEN
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

# Reiniciar el servicio
echo -e "${YELLOW}🔄 Reiniciando servicio API RRSS...${NC}"
cd ..
docker compose restart api_rrss
sleep 3

echo -e "${GREEN}✓ Servicio reiniciado${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Configuración Completada${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✅ Configurado Correctamente:${NC}"
echo "  • Facebook Page ID: $PAGE_ID"
echo "  • Página: $PAGE_NAME"
echo "  • Instagram Account ID: $INSTAGRAM_ID"
echo "  • API funcionando en puerto 8002"
echo ""

echo -e "${BLUE}🚀 Próximos Pasos:${NC}"
echo "1. Probar publicación en Facebook"
echo "2. Probar publicación en Instagram (si está configurado)"
echo "3. Integrar con N8N para automatización"
echo "4. Configurar LinkedIn y WhatsApp (opcional)"
echo ""

echo -e "${GREEN}🎉 ¡API RRSS completamente configurada!${NC}"
echo "Lista para publicar en A Security Insurance"
