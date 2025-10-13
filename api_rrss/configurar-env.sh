#!/bin/bash

# Script para configurar el archivo .env con el token actual
# Uso: ./configurar-env.sh

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TOKEN="EAAfb1rFlCW4BPmT1hNbtFXtlPfFJV2MTQzdnYZCB7Uh75RU5EIjBQKZBAsaoqUzciOWFDdhUah4nloJazhdmAIeaLssFpHusFekg4dbqoDLHviSHtIPxdSGaeMYZAzUazmORz7qYegwZByR312ZAvtGDHnPMZADdBZAZAkKukJmms3J3WhKC5h0wQUQztVrsZBfsl90kp0s7MudMd7dVcEjZAwB5PiJZCEL9OUl2KNmc2QywGMlZChnhh5e1hNb92AqQwI1WDnFws7H0sf3k"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Configurando API RRSS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar si el archivo .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: No se encontró el archivo .env${NC}"
    echo "Por favor, crea el archivo .env primero"
    exit 1
fi

echo -e "${YELLOW}📝 Actualizando archivo .env con el token actual...${NC}"

# Crear backup del archivo .env
cp .env .env.backup
echo -e "${GREEN}✓ Backup creado: .env.backup${NC}"

# Actualizar el archivo .env con el token actual
cat > .env << EOF
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=$TOKEN
INSTAGRAM_ACCOUNT_ID=placeholder

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=$TOKEN
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

echo -e "${GREEN}✓ Archivo .env actualizado${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Estado de la Configuración${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Configurado:${NC}"
echo "  • Facebook Access Token (funcional)"
echo "  • Instagram Access Token (mismo token)"
echo ""
echo -e "${YELLOW}⚠️  Requiere configuración:${NC}"
echo "  • Facebook Page ID (necesitas crear una página)"
echo "  • Instagram Account ID (necesita cuenta Business)"
echo "  • LinkedIn (proceso separado)"
echo "  • WhatsApp (proceso separado)"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🚀 Próximos Pasos${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Crear una página de Facebook:"
echo "   https://www.facebook.com/pages/create"
echo ""
echo "2. Convertir Instagram a Business Account:"
echo "   Instagram móvil → Settings → Account → Switch to Professional"
echo ""
echo "3. Iniciar el servicio API RRSS:"
echo "   cd .. && docker compose up -d api_rrss"
echo ""
echo "4. Probar la API:"
echo "   curl http://localhost:8002/health"
echo ""

echo -e "${GREEN}🎉 Configuración básica completada!${NC}"
echo "Tu API RRSS está lista para usar con Facebook básico."
