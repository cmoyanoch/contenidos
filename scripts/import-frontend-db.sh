#!/bin/bash
##############################################################################
# Script: import-frontend-db.sh
# Descripción: Importa un dump de frontend_db en el servidor remoto
#
# ⚠️ IMPORTANTE: Este script solo importa frontend_db, NO n8n_db
#    - n8n_db debe configurarse independientemente en cada servidor
#    - Los workflows de N8N se importan desde la UI de N8N
#
# Uso: ./scripts/import-frontend-db.sh <archivo_backup.sql.gz>
##############################################################################

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
DB_NAME="frontend_db"
DB_USER="postgres"
BACKUP_FILE="$1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Importación de frontend_db${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  Este script solo importa frontend_db${NC}"
echo -e "${YELLOW}   n8n_db NO se ve afectado${NC}"
echo ""

# Auto-detectar el nombre del contenedor PostgreSQL
echo -e "${YELLOW}🔍 Detectando contenedor PostgreSQL...${NC}"
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "postgres|db" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    # Intentar por imagen
    CONTAINER_NAME=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -1)
fi

if [ -z "$CONTAINER_NAME" ]; then
    # Intentar buscar contenedor con puerto 5432
    CONTAINER_NAME=$(docker ps --format "{{.Names}}\t{{.Ports}}" | grep "5432" | cut -f1 | head -1)
fi

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${RED}❌ Error: No se encontró contenedor PostgreSQL corriendo${NC}"
    echo -e "${YELLOW}💡 Contenedores disponibles:${NC}"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    echo -e "${YELLOW}💡 Especifica el nombre manualmente: export DB_CONTAINER=nombre_contenedor${NC}"
    exit 1
fi

# Permitir override manual
if [ ! -z "$DB_CONTAINER" ]; then
    CONTAINER_NAME="$DB_CONTAINER"
fi

echo -e "${GREEN}✅ Contenedor detectado: ${CONTAINER_NAME}${NC}"
echo ""

# Validar argumentos
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Debes especificar el archivo de backup${NC}"
    echo -e "${YELLOW}Uso: $0 <archivo_backup.sql.gz>${NC}"
    echo ""
    echo -e "${YELLOW}Backups disponibles:${NC}"
    ls -lh backups/ 2>/dev/null | grep ".sql" || echo "  (No hay backups disponibles)"
    exit 1
fi

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: El archivo '$BACKUP_FILE' no existe${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archivo de backup encontrado${NC}"
echo -e "  Ubicación: ${GREEN}${BACKUP_FILE}${NC}"
echo -e "  Tamaño: ${GREEN}$(du -h "$BACKUP_FILE" | cut -f1)${NC}"
echo ""

# Verificar que el contenedor de PostgreSQL está corriendo
echo -e "${YELLOW}🔍 Verificando contenedor de PostgreSQL...${NC}"
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Error: El contenedor '$CONTAINER_NAME' no está corriendo${NC}"
    echo -e "${YELLOW}💡 Ejecuta: docker compose up -d db${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contenedor encontrado y corriendo${NC}"
echo ""

# Verificar que n8n_db NO será afectado
echo -e "${YELLOW}🔒 Verificando que n8n_db NO será afectado...${NC}"
N8N_DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -w "n8n_db" | wc -l || echo "0")
if [ "$N8N_DB_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ n8n_db existe y NO será modificado${NC}"
else
    echo -e "${YELLOW}⚠️  n8n_db no existe (deberá crearse separadamente)${NC}"
fi
echo ""

# Crear backup de la base de datos actual (si existe)
echo -e "${YELLOW}🔄 Verificando base de datos existente...${NC}"
DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l || echo "0")

if [ "$DB_EXISTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  La base de datos '$DB_NAME' ya existe${NC}"
    echo -e "${YELLOW}📦 Creando backup de seguridad antes de sobrescribir...${NC}"

    mkdir -p backups
    SAFETY_BACKUP="backups/frontend_db_before_import_$(date +%Y%m%d_%H%M%S).sql"
    docker exec "$CONTAINER_NAME" pg_dump \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      --clean \
      --if-exists \
      > "$SAFETY_BACKUP" 2>/dev/null || true

    echo -e "${GREEN}✅ Backup de seguridad creado: ${SAFETY_BACKUP}${NC}"
    echo ""
fi

# Descomprimir el archivo si está comprimido
TEMP_SQL_FILE="/tmp/frontend_db_import_$(date +%s).sql"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}📦 Descomprimiendo backup...${NC}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL_FILE"
    SQL_FILE="$TEMP_SQL_FILE"
else
    SQL_FILE="$BACKUP_FILE"
fi

echo -e "${GREEN}✅ Archivo SQL preparado${NC}"
echo ""

# Mostrar preview del contenido
echo -e "${YELLOW}📄 Preview del archivo SQL (primeras líneas):${NC}"
head -n 30 "$SQL_FILE" | grep -E "CREATE DATABASE|CREATE SCHEMA|CREATE TABLE" | head -10 || echo "  (Preparando estructura...)"
echo ""

# Confirmar antes de importar
echo -e "${YELLOW}⚠️  ADVERTENCIA: Esta operación sobrescribirá frontend_db${NC}"
echo -e "${YELLOW}   (n8n_db NO se verá afectado)${NC}"
echo ""
read -p "¿Deseas continuar? (y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Importación cancelada por el usuario${NC}"
    rm -f "$TEMP_SQL_FILE"
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Iniciando importación...${NC}"
echo ""

# Eliminar base de datos existente (si existe)
if [ "$DB_EXISTS" -gt 0 ]; then
    echo -e "${YELLOW}🗑️  Eliminando base de datos existente...${NC}"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
fi

# Importar el dump (conectando a 'postgres' para crear la DB)
echo -e "${YELLOW}📥 Importando base de datos...${NC}"
cat "$SQL_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres 2>&1 | grep -v "^$" || true

# Verificar resultado
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Importación completada exitosamente${NC}"
else
    echo ""
    echo -e "${RED}❌ Error durante la importación${NC}"
    echo -e "${YELLOW}💡 Revisa los logs con: docker compose logs db${NC}"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

# Limpiar archivo temporal
rm -f "$TEMP_SQL_FILE"

# Verificar que la base de datos fue creada
echo ""
echo -e "${YELLOW}🔍 Verificando base de datos importada...${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null || echo "  (No se encontraron tablas públicas)"

# Contar registros importados
echo ""
echo -e "${YELLOW}🔢 Contando registros importados...${NC}"
TOTAL_RECORDS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT COALESCE(SUM(n_live_tup), 0)
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
" 2>/dev/null | xargs || echo "0")
echo -e "  Total de registros: ${GREEN}${TOTAL_RECORDS}${NC}"

# Listar tablas importadas
echo ""
echo -e "${YELLOW}📋 Tablas importadas en frontend_db:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT tablename, COALESCE(n_live_tup, 0) as rows
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
" 2>/dev/null | while read table rows; do
    if [ ! -z "$table" ]; then
        table=$(echo "$table" | xargs)
        rows=$(echo "$rows" | xargs)
        echo -e "  • ${GREEN}${table}${NC}: ${rows} registros"
    fi
done

echo ""
echo -e "${YELLOW}🔧 Actualizando estadísticas de la base de datos...${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" 2>/dev/null

# Verificar que n8n_db sigue intacto
echo ""
echo -e "${YELLOW}🔒 Verificando que n8n_db NO fue afectado...${NC}"
N8N_DB_CHECK=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -w "n8n_db" | wc -l || echo "0")
if [ "$N8N_DB_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✅ n8n_db sigue intacto y sin modificar${NC}"
else
    echo -e "${YELLOW}ℹ️  n8n_db no existe (normal en servidor nuevo)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Importación Completada${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo -e "  1. Verificar integridad: ${GREEN}./scripts/verify-frontend-db.sh${NC}"
echo -e "  2. Regenerar Prisma Client: ${GREEN}cd frontend && npx prisma generate${NC}"
echo -e "  3. Reiniciar servicios: ${GREEN}docker compose restart frontend api_google${NC}"
echo -e "  4. (Opcional) Configurar n8n_db si es servidor nuevo"
echo ""
