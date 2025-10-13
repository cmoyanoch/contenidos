# Database Migrations - Campaign System

## 📋 Cambios Implementados (2025-09-27)

### Nuevos Schemas Agregados:
1. **Campaign**: Sistema de gestión de campañas de contenido
2. **VideoOperation**: Relación opcional con campañas

## 🚀 Comandos para Aplicar Migraciones

### 1. Generar Migration
```bash
cd /home/cristian/Escritorio/server_marcia/contenidos/frontend
npx prisma migrate dev --name add_campaign_system
```

### 2. Aplicar Migration en Producción
```bash
npx prisma migrate deploy
```

### 3. Regenerar Prisma Client
```bash
npx prisma generate
```

### 4. Verificar Database
```bash
npx prisma studio
```

## 📊 Estructura de Tables Creadas

### `campaigns`
```sql
CREATE TABLE "campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "type" TEXT NOT NULL,
  "targetPlatforms" TEXT[],
  "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
  "duration" INTEGER NOT NULL DEFAULT 8,
  "promptTemplate" TEXT,
  "characterStyle" TEXT,
  "brandGuidelines" TEXT,
  "scheduledStart" TIMESTAMP(3),
  "scheduledEnd" TIMESTAMP(3),
  "frequency" TEXT,
  "totalVideos" INTEGER NOT NULL DEFAULT 1,
  "tags" TEXT[],
  "priority" INTEGER NOT NULL DEFAULT 5,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### Modificación `video_operations`
```sql
ALTER TABLE "video_operations"
ADD COLUMN "campaignId" TEXT,
ADD CONSTRAINT "video_operations_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## 🔧 Troubleshooting

### Error: Permission Denied
```bash
sudo chown -R $USER:$USER /home/cristian/Escritorio/server_marcia/contenidos/frontend/node_modules
```

### Error: Database Connection
Verificar que PostgreSQL esté corriendo:
```bash
docker compose ps db
```

### Error: Schema Mismatch
Resetear database (⚠️ Solo en desarrollo):
```bash
npx prisma migrate reset
```

## 📝 Test Queries

### Crear Campaña Test
```sql
INSERT INTO campaigns (id, name, type, userId, status)
VALUES ('test-campaign-001', 'Test UGC Campaign', 'ugc_video', 'user-id-here', 'draft');
```

### Verificar Relaciones
```sql
SELECT c.name, COUNT(vo.id) as video_count
FROM campaigns c
LEFT JOIN video_operations vo ON c.id = vo.campaignId
GROUP BY c.id, c.name;
```

## 🎯 Próximos Pasos

1. **Frontend Components**: Crear UI para gestión de campañas
2. **N8N Integration**: Modificar workflows para incluir campaignId
3. **Automation**: Scheduler para campañas programadas
4. **Analytics**: Dashboard de performance por campaña