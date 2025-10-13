#!/bin/bash
##############################################################################
# Script: export-frontend-db.sh
# Descripción: Exporta SOLO la base de datos frontend_db a un archivo SQL
#
# ⚠️ IMPORTANTE: Este script NO exporta n8n_db (workflows de N8N)
#    - n8n_db debe manejarse independientemente en cada servidor
#    - Los workflows de N8N se pueden exportar desde la UI de N8N
#    - frontend_db contiene: usuarios, videos, campañas, credenciales, etc.
#
# Uso: ./scripts/export-frontend-db.sh [nombre_archivo_opcional]
##############################################################################

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
DB_NAME="frontend_db"  # ⚠️ SOLO frontend_db, NO n8n_db
DB_USER="postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DEFAULT_FILENAME="frontend_db_backup_${TIMESTAMP}.sql"

# Usar nombre de archivo personalizado o el predeterminado
BACKUP_FILE="${1:-$DEFAULT_FILENAME}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Exportación de frontend_db${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Solo se exportará 'frontend_db'${NC}"
echo -e "${YELLOW}   n8n_db NO se incluirá en este backup${NC}"
echo ""

# Crear directorio de backups si no existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 Creando directorio de backups...${NC}"
    mkdir -p "$BACKUP_DIR"
fi

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
    echo -e "${YELLOW}💡 Contenedores disponibles:${NC}"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    echo -e "${YELLOW}💡 Ejecuta: docker compose up -d${NC}"
    exit 1
fi

# Permitir override manual
if [ ! -z "$DB_CONTAINER" ]; then
    CONTAINER_NAME="$DB_CONTAINER"
fi

echo -e "${GREEN}✅ Contenedor detectado: ${CONTAINER_NAME}${NC}"
echo ""

# Obtener información de la base de datos
echo -e "${YELLOW}📊 Información de la base de datos:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\l $DB_NAME" 2>/dev/null || true
echo ""

# Listar tablas antes del backup
echo -e "${YELLOW}📋 Tablas en la base de datos:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null || echo "  (No hay tablas aún)"
echo ""

# Contar registros totales
echo -e "${YELLOW}🔢 Contando registros...${NC}"
TOTAL_RECORDS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT SUM(n_live_tup)
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
" 2>/dev/null | xargs || echo "0")
echo -e "  Total de registros: ${GREEN}${TOTAL_RECORDS}${NC}"
echo ""

# Crear dump de la base de datos
echo -e "${YELLOW}💾 Creando dump de la base de datos...${NC}"
echo -e "  Base de datos: ${GREEN}${DB_NAME}${NC}"
echo -e "  Archivo: ${GREEN}${BACKUP_PATH}${NC}"
echo ""

# pg_dump con opciones optimizadas
docker exec "$CONTAINER_NAME" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --create \
  --no-owner \
  --no-privileges \
  --format=plain \
  --verbose \
  > "$BACKUP_PATH" 2>&1

# Verificar que el archivo se creó correctamente
if [ ! -f "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Error: No se pudo crear el archivo de backup${NC}"
    exit 1
fi

# Obtener tamaño del archivo
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo ""
echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
echo -e "  Ubicación: ${GREEN}${BACKUP_PATH}${NC}"
echo -e "  Tamaño: ${GREEN}${BACKUP_SIZE}${NC}"
echo ""

# Crear archivo comprimido (gzip)
echo -e "${YELLOW}📦 Comprimiendo backup...${NC}"
gzip -c "$BACKUP_PATH" > "${BACKUP_PATH}.gz"
COMPRESSED_SIZE=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
echo -e "${GREEN}✅ Backup comprimido creado${NC}"
echo -e "  Ubicación: ${GREEN}${BACKUP_PATH}.gz${NC}"
echo -e "  Tamaño: ${GREEN}${COMPRESSED_SIZE}${NC}"
echo ""

# Crear archivo de metadata
METADATA_FILE="${BACKUP_PATH}.meta"
cat > "$METADATA_FILE" << EOF
# Metadata del Backup
Fecha de creación: $(date)
Base de datos: $DB_NAME
Usuario: $DB_USER
Total de registros: $TOTAL_RECORDS
Tamaño original: $BACKUP_SIZE
Tamaño comprimido: $COMPRESSED_SIZE
Servidor: $(hostname)
Docker Container: $CONTAINER_NAME

# Schemas incluidos:
$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')")

# Tablas incluidas:
$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
EOF

echo -e "${GREEN}✅ Archivo de metadata creado${NC}"
echo -e "  Ubicación: ${GREEN}${METADATA_FILE}${NC}"
echo ""

# Listar todos los backups
echo -e "${YELLOW}📂 Backups disponibles:${NC}"
ls -lh "$BACKUP_DIR" | grep "frontend_db_backup" || echo "  (No hay backups previos)"
echo ""

# Instrucciones para transferir al servidor remoto
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Instrucciones para Servidor Remoto${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}1. Transferir archivo al servidor remoto:${NC}"
echo -e "   ${GREEN}scp ${BACKUP_PATH}.gz usuario@servidor:/ruta/destino/${NC}"
echo ""
echo -e "${YELLOW}2. En el servidor remoto, ejecutar:${NC}"
echo -e "   ${GREEN}./scripts/import-frontend-db.sh $(basename ${BACKUP_PATH}.gz)${NC}"
echo ""
echo -e "${YELLOW}3. Verificar importación:${NC}"
echo -e "   ${GREEN}./scripts/verify-frontend-db.sh${NC}"
echo ""

# Crear archivo README con instrucciones
README_FILE="${BACKUP_DIR}/README_MIGRACION.md"
cat > "$README_FILE" << 'EOF'
# 📦 Guía de Migración de Base de Datos - frontend_db

## 🎯 Descripción

Este backup contiene la base de datos completa de `frontend_db` incluyendo:
- Tablas de usuarios
- Operaciones de video
- Credenciales de RRSS
- Campañas y planificaciones
- Schemas de API Google y API RRSS

## 📋 Pre-requisitos en Servidor Remoto

1. Docker y Docker Compose instalados
2. Contenedor PostgreSQL corriendo
3. Scripts de importación disponibles en `./scripts/`

## 🚀 Proceso de Migración

### Paso 1: Transferir el Backup

```bash
# Desde tu máquina local
scp backups/frontend_db_backup_*.sql.gz usuario@servidor-remoto:/ruta/contenidos/backups/
```

### Paso 2: Importar en Servidor Remoto

```bash
# En el servidor remoto
cd /ruta/contenidos
./scripts/import-frontend-db.sh backups/frontend_db_backup_YYYYMMDD_HHMMSS.sql.gz
```

### Paso 3: Verificar Importación

```bash
# Verificar que todo se importó correctamente
./scripts/verify-frontend-db.sh
```

## 🔐 Seguridad

- ⚠️  Este backup contiene datos sensibles
- 🔒 Mantener en ubicación segura
- 🗑️  Eliminar después de migración exitosa
- 📝 No compartir en repositorios públicos

## 🆘 Troubleshooting

### Error: "database already exists"
```bash
# Eliminar base de datos existente primero
docker exec db psql -U postgres -c "DROP DATABASE IF EXISTS frontend_db;"
```

### Error: "role does not exist"
```bash
# Crear usuario si no existe
docker exec db psql -U postgres -c "CREATE USER postgres WITH PASSWORD 'password';"
```

### Error: "permission denied"
```bash
# Dar permisos completos
docker exec db psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

## 📞 Soporte

Para problemas adicionales, revisar logs:
```bash
docker compose logs db
```
EOF

echo -e "${GREEN}✅ Archivo README de migración creado${NC}"
echo -e "  Ubicación: ${GREEN}${README_FILE}${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Exportación Completada${NC}"
echo -e "${GREEN}========================================${NC}"
