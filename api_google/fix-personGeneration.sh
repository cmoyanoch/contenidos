#!/bin/bash

# Script para corregir el parámetro personGeneration en la API Google
# Autor: Sistema de Contenidos
# Fecha: $(date)

echo "🔧 === CORRIGIENDO PARÁMETRO personGeneration ==="
echo "📅 Fecha: $(date)"

# Verificar que el contenedor esté corriendo
if ! docker ps | grep -q "contenidos-api_google-1"; then
    echo "❌ Error: Contenedor API Google no está corriendo"
    echo "💡 Ejecuta './compile-api-google.sh' primero"
    exit 1
fi

echo "✅ Contenedor API Google está corriendo"

# Aplicar la corrección
echo "🔨 Aplicando corrección personGeneration..."
docker exec contenidos-api_google-1 python -c "
# Leer el archivo
with open('/app/tasks/video_tasks_genai.py', 'r') as f:
    content = f.read()

# Reemplazar las líneas problemáticas
content = content.replace(
    '        if person_generation:\n            payload[\"parameters\"][\"personGeneration\"] = person_generation',
    '        # CORREGIDO: personGeneration ya no es soportado por Veo 3.0 API\n        # if person_generation:\n        #     payload[\"parameters\"][\"personGeneration\"] = person_generation'
)

# Reemplazar la segunda instancia
content = content.replace(
    '        if person_generation and person_generation != \"dont_allow\":\n            payload[\"parameters\"][\"personGeneration\"] = person_generation',
    '        # CORREGIDO: personGeneration ya no es soportado por Veo 3.0 API\n        # if person_generation and person_generation != \"dont_allow\":\n        #     payload[\"parameters\"][\"personGeneration\"] = person_generation'
)

# Escribir el archivo corregido
with open('/app/tasks/video_tasks_genai.py', 'w') as f:
    f.write(content)

print('✅ Archivo corregido: personGeneration eliminado')
"

if [ $? -eq 0 ]; then
    echo "✅ Corrección aplicada exitosamente"
    echo "🔄 Reiniciando contenedor para aplicar cambios..."
    docker compose restart api_google
    
    echo "⏳ Esperando a que la API esté lista..."
    sleep 10
    
    echo "🔍 Verificando estado de la API..."
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ API Google corregida y funcionando correctamente"
        echo "🌐 URL: http://localhost:8001"
    else
        echo "⚠️  API iniciada pero no responde en el health check"
        echo "💡 Revisa los logs: docker logs contenidos-api_google-1"
    fi
else
    echo "❌ Error al aplicar la corrección"
    exit 1
fi

echo ""
echo "🎉 === CORRECCIÓN COMPLETADA ==="
echo "📋 El parámetro personGeneration ha sido eliminado del código"
echo "💡 Ahora las operaciones deberían funcionar sin el error de Veo 3.0"
