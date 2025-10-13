#!/bin/bash

# Script para configurar API sin página (modo básico)
# Uso: ./configurar-sin-pagina.sh

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Configurando API RRSS en Modo Básico${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📝 Configurando para funcionalidades disponibles...${NC}"

# Crear archivo .env con configuración básica
cat > .env << 'EOF'
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=EAAfb1rFlCW4BPmT1hNbtFXtlPfFJV2MTQzdnYZCB7Uh75RU5EIjBQKZBAsaoqUzciOWFDdhUah4nloJazhdmAIeaLssFpHusFekg4dbqoDLHviSHtIPxdSGaeMYZAzUazmORz7qYegwZByR312ZAvtGDHnPMZADdBZAZAkKukJmms3J3WhKC5h0wQUQztVrsZBfsl90kp0s7MudMd7dVcEjZAwB5PiJZCEL9OUl2KNmc2QywGMlZChnhh5e1hNb92AqQwI1WDnFws7H0sf3k
INSTAGRAM_ACCOUNT_ID=placeholder

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=EAAfb1rFlCW4BPmT1hNbtFXtlPfFJV2MTQzdnYZCB7Uh75RU5EIjBQKZBAsaoqUzciOWFDdhUah4nloJazhdmAIeaLssFpHusFekg4dbqoDLHviSHtIPxdSGaeMYZAzUazmORz7qYegwZByR312ZAvtGDHnPMZADdBZAZAkKukJmms3J3WhKC5h0wQUQztVrsZBfsl90kp0s7MudMd7dVcEjZAwB5PiJZCEL9OUl2KNmc2QywGMlZChnhh5e1hNb92AqQwI1WDnFws7H0sf3k
FACEBOOK_PAGE_ID=placeholder

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

echo -e "${GREEN}✓ Archivo .env configurado${NC}"

# Reiniciar el servicio
echo -e "${YELLOW}🔄 Reiniciando servicio API RRSS...${NC}"
cd ..
docker compose restart api_rrss
sleep 3

echo -e "${GREEN}✓ Servicio reiniciado${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Estado de la API RRSS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✅ Funcionalidades Disponibles:${NC}"
echo "  • API iniciada en puerto 8002"
echo "  • Documentación en http://localhost:8002/docs"
echo "  • Endpoints configurados"
echo "  • Listo para integración con N8N"
echo ""

echo -e "${YELLOW}⚠️  Requiere configuración adicional:${NC}"
echo "  • Facebook Page ID (para publicar en Facebook)"
echo "  • Instagram Account ID (para publicar en Instagram)"
echo "  • LinkedIn credentials (para LinkedIn)"
echo "  • WhatsApp credentials (para WhatsApp)"
echo ""

echo -e "${BLUE}🚀 Próximos Pasos:${NC}"
echo "1. Obtener Page ID de tu página de Facebook"
echo "2. Configurar Instagram Business Account"
echo "3. Integrar con N8N para automatización"
echo "4. Configurar LinkedIn y WhatsApp (opcional)"
echo ""

echo -e "${GREEN}🎉 API RRSS configurada en modo básico!${NC}"
echo "Puedes empezar a integrar con N8N y otros sistemas."
