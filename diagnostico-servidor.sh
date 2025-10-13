#!/bin/bash

echo "=========================================="
echo "🔍 DIAGNÓSTICO DEL SERVIDOR REMOTO"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📁 1. ESTADO DEL REPOSITORIO"
echo "----------------------------------------"
cd /root/contenidos 2>/dev/null || cd /home/contenidos 2>/dev/null || cd /var/www/contenidos 2>/dev/null || pwd
git status
echo ""

echo "📊 2. ÚLTIMOS COMMITS"
echo "----------------------------------------"
git log --oneline -5
echo ""

echo "📂 3. ARCHIVOS DEL FRONTEND - src/lib/"
echo "----------------------------------------"
ls -la frontend/src/lib/ 2>/dev/null || echo "❌ Directorio no encontrado"
echo ""

echo "📋 4. ARCHIVOS RASTREADOS EN GIT"
echo "----------------------------------------"
git ls-files | grep "frontend/src/lib/" || echo "❌ No hay archivos rastreados"
echo ""

echo "🐳 5. ESTADO DE LOS CONTENEDORES"
echo "----------------------------------------"
docker compose ps
echo ""

echo "📦 6. IMÁGENES DOCKER"
echo "----------------------------------------"
docker images | grep contenidos
echo ""

echo "📝 7. LOGS DEL FRONTEND (últimas 30 líneas)"
echo "----------------------------------------"
docker compose logs frontend --tail=30 2>/dev/null || echo "❌ Contenedor no encontrado"
echo ""

echo "🔨 8. INTENTAR BUILD DEL FRONTEND"
echo "----------------------------------------"
echo "⚠️  Esto puede tardar varios minutos..."
docker compose build frontend --no-cache 2>&1 | tail -50
echo ""

echo "✅ 9. VERIFICAR SERVICIOS ACTIVOS"
echo "----------------------------------------"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "=========================================="
echo "✅ DIAGNÓSTICO COMPLETADO"
echo "=========================================="

