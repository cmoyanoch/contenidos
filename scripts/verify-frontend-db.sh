#!/bin/bash
##############################################################################
# Script: verify-frontend-db.sh
# Descripción: Verifica la integridad de frontend_db después de importación
# Uso: ./scripts/verify-frontend-db.sh
##############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
DB_NAME="frontend_db"
DB_USER="postgres"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verificación de frontend_db${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Auto-detectar el nombre del contenedor PostgreSQL
echo -e "${YELLOW}🔍 Detectando contenedor PostgreSQL...${NC}"
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "postgres|db" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -1)
fi

if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps --format "{{.Names}}\t{{.Ports}}" | grep "5432" | cut -f1 | head -1)
fi

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${RED}❌ Error: No se encontró contenedor PostgreSQL corriendo${NC}"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    exit 1
fi

# Permitir override manual
if [ ! -z "$DB_CONTAINER" ]; then
    CONTAINER_NAME="$DB_CONTAINER"
fi

echo -e "${GREEN}✅ Contenedor detectado: ${CONTAINER_NAME}${NC}"
echo ""

# Verificar que la base de datos existe
echo -e "${YELLOW}🔍 Verificando existencia de frontend_db...${NC}"
DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l)
if [ "$DB_EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ Error: La base de datos '$DB_NAME' no existe${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Base de datos existe${NC}"
echo ""

# Información general
echo -e "${YELLOW}📊 Información General:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    pg_size_pretty(pg_database_size('$DB_NAME')) as database_size,
    (SELECT count(*) FROM pg_stat_user_tables WHERE schemaname = 'public') as table_count
" 2>/dev/null
echo ""

# Listar todas las tablas con conteo de registros
echo -e "${YELLOW}📋 Tablas en frontend_db:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    schemaname,
    tablename,
    COALESCE(n_live_tup, 0) as rows,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
" 2>/dev/null
echo ""

# Verificar tablas críticas de Prisma
echo -e "${YELLOW}🔍 Verificando tablas críticas:${NC}"

CRITICAL_TABLES=(
    "users"
    "video_operations"
    "campaigns"
    "sessions"
    "accounts"
)

ALL_OK=true
for table in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '$table'
    " 2>/dev/null | xargs)

    if [ "$EXISTS" -eq 1 ]; then
        COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT COUNT(*) FROM $table
        " 2>/dev/null | xargs)
        echo -e "  ✅ ${GREEN}$table${NC}: $COUNT registros"
    else
        echo -e "  ❌ ${RED}$table${NC}: NO EXISTE"
        ALL_OK=false
    fi
done
echo ""

# Verificar índices
echo -e "${YELLOW}🔍 Verificando índices:${NC}"
INDEX_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE schemaname = 'public'
" 2>/dev/null | xargs)
echo -e "  Total de índices: ${GREEN}$INDEX_COUNT${NC}"
echo ""

# Verificar constraints (foreign keys, etc.)
echo -e "${YELLOW}🔍 Verificando constraints:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
LIMIT 10;
" 2>/dev/null
echo ""

# Verificar que n8n_db existe y no fue afectado
echo -e "${YELLOW}🔒 Verificando n8n_db (debe estar intacto):${NC}"
N8N_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -w "n8n_db" | wc -l)
if [ "$N8N_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ n8n_db existe y no fue afectado${NC}"
    N8N_TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "n8n_db" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'n8n'
    " 2>/dev/null | xargs || echo "0")
    echo -e "  Tablas en n8n_db: ${GREEN}$N8N_TABLES${NC}"
else
    echo -e "${YELLOW}ℹ️  n8n_db no existe (esperado en servidor nuevo)${NC}"
fi
echo ""

# Test de conectividad
echo -e "${YELLOW}🔌 Test de Conectividad:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as connected;" 2>/dev/null
echo ""

# Resumen final
if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✅ Verificación Exitosa${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos pasos recomendados:${NC}"
    echo -e "  1. Regenerar Prisma Client: ${GREEN}cd frontend && npx prisma generate${NC}"
    echo -e "  2. Reiniciar servicios: ${GREEN}docker compose restart frontend api_google${NC}"
    echo -e "  3. Verificar login en: ${GREEN}http://localhost:3000/login${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ⚠️  Verificación Incompleta${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Algunas tablas críticas no se encontraron${NC}"
    echo -e "${YELLOW}Considera re-importar el backup${NC}"
fi
echo ""
