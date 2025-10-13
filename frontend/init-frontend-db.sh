#!/bin/bash

# Script para inicializar la base de datos del frontend
echo "🚀 Inicializando base de datos del frontend..."

# Generar cliente de Prisma
echo "�� Generando cliente de Prisma..."
npx prisma generate

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
npx prisma db push

echo "✅ Base de datos del frontend inicializada correctamente!"
