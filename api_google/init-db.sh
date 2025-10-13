#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Crear base de datos para N8N
    CREATE DATABASE n8n_db;

    -- Crear base de datos para Frontend (unificada)
    CREATE DATABASE frontend_db;

    -- Conectar a la base de datos n8n_db y crear el schema n8n
    \c n8n_db;
    CREATE SCHEMA IF NOT EXISTS n8n;

    -- Dar permisos al usuario postgres sobre el schema n8n
    GRANT ALL PRIVILEGES ON SCHEMA n8n TO postgres;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA n8n TO postgres;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA n8n TO postgres;
    GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA n8n TO postgres;

    -- Configurar el search_path por defecto para incluir el schema n8n
    ALTER DATABASE n8n_db SET search_path TO n8n, public;

    -- Conectar a frontend_db y crear schemas para APIs
    \c frontend_db;
    CREATE SCHEMA IF NOT EXISTS api_google;
    CREATE SCHEMA IF NOT EXISTS api_rrss;

    -- Dar permisos sobre los schemas de APIs
    GRANT ALL PRIVILEGES ON SCHEMA api_google TO postgres;
    GRANT ALL PRIVILEGES ON SCHEMA api_rrss TO postgres;

    -- Conectar de vuelta a la base de datos principal
    \c $POSTGRES_DB;

    -- Mostrar las bases de datos creadas
    SELECT datname FROM pg_database WHERE datistemplate = false;
EOSQL

echo "Bases de datos n8n_db y frontend_db creadas exitosamente con esquemas separados."