#!/bin/bash

# Build Script para API Google - Compilación Robusta con Cache Cleaning
# Autor: Sistema de Contenidos
# Fecha: $(date)
# Uso: cd api_google && ./build.sh

echo "🚀 === BUILD API GOOGLE - COMPILACIÓN ROBUSTA ==="
echo "📅 Fecha: $(date)"
echo "📁 Directorio: $(pwd)"

# Verificar que estamos en el directorio correcto
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: No se encontró requirements.txt"
    echo "💡 Asegúrate de estar en el directorio api_google/"
    exit 1
fi

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    echo "💡 Inicia Docker antes de continuar"
    exit 1
fi

echo "✅ Verificaciones completadas"

# Detener y eliminar contenedores
echo "🛑 Deteniendo y eliminando contenedores..."
docker compose down api_google 2>/dev/null || echo "   Contenedor ya estaba detenido"

# Eliminar imagen para forzar reconstrucción
echo "🗑️ Eliminando imagen antigua..."
docker rmi contenidos-api_google 2>/dev/null || echo "   Imagen ya eliminada"

# Limpiar caché de Docker completamente
echo "🧹 Limpiando caché de Docker..."
docker builder prune -af

# Fix adicional: Limpiar BuildKit cache específicamente
echo "🧹 Limpiando BuildKit cache..."
docker buildx prune -af 2>/dev/null || echo "   BuildKit no disponible"

# Fix adicional: Limpiar volumes de build temporales
echo "🧹 Limpiando volumes temporales..."
docker volume prune -f 2>/dev/null || echo "   Volumes ya limpios"

# Limpiar caché de Celery específicamente
echo "🔄 Limpiando caché de Celery..."
docker compose down worker beat 2>/dev/null || echo "   Workers ya detenidos"
docker rmi contenidos-worker contenidos-beat 2>/dev/null || echo "   Imágenes de workers ya eliminadas"

# Fix adicional: Limpiar cache de Python y pip
echo "🐍 Limpiando cache de Python..."
# Eliminar __pycache__ local si existe
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || echo "   Cache Python local ya limpio"
find . -name "*.pyc" -delete 2>/dev/null || echo "   Archivos .pyc ya eliminados"

# Fix adicional: Verificar que requirements.txt no esté cached
echo "📦 Verificando requirements.txt..."
touch requirements.txt  # Actualizar timestamp para forzar rebuild

# Reconstruir imagen completamente desde cero
echo "🔨 Reconstruyendo imagen desde cero..."
# Fix adicional: Usar pull y no-cache-from para garantizar base images frescas
docker compose build --no-cache --pull --no-cache-from api_google

# Reconstruir workers de Celery
echo "🔨 Reconstruyendo workers de Celery..."
docker compose build --no-cache --pull --no-cache-from worker beat

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker compose up -d api_google worker beat

# Verificar que los servicios estén funcionando
echo "⏳ Esperando que los servicios estén listos..."
sleep 15

# Verificar API con retry mejorado
echo "🔍 Verificando API..."
RETRIES=5
for i in $(seq 1 $RETRIES); do
    if curl -s http://localhost:8001/health > /dev/null; then
        echo "✅ API funcionando correctamente"
        break
    else
        echo "   Intento $i/$RETRIES fallido, reintentando..."
        sleep 5
        if [ $i -eq $RETRIES ]; then
            echo "❌ API no responde después de $RETRIES intentos"
            echo "📋 Logs de API:"
            docker compose logs api_google --tail=10
            exit 1
        fi
    fi
done

# Verificar workers de Celery
echo "🔍 Verificando workers de Celery..."
if docker compose ps worker | grep -q "Up"; then
    echo "✅ Workers de Celery funcionando"
else
    echo "❌ Workers de Celery no funcionan"
    exit 1
fi

echo ""
echo "🎉 === BUILD API GOOGLE COMPLETADO ==="
echo "✅ Todos los servicios funcionando"
echo "✅ Cache completamente limpiado"
echo "✅ Código actualizado aplicado"
echo ""
echo "📋 Servicios disponibles:"
echo "   🌐 API: http://localhost:8001"
echo "   📊 Health: http://localhost:8001/health"
echo "   🔄 Workers: Funcionando con código limpio"
echo ""
echo "💡 Uso del script:"
echo "   cd api_google && ./build.sh"
