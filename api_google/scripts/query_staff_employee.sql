-- ==========================================
-- QUERIES DE EJEMPLO: staff_employee
-- Base de Datos: frontend_db
-- Esquema: api_google
-- ==========================================

-- ==========================================
-- 1. INSERTAR EMPLEADOS
-- ==========================================

-- Insertar empleado con rutas relativas (ejemplo real)
INSERT INTO api_google.staff_employee (name, image_url_1, image_url_2, description)
VALUES
(
    'Cristian Rodriguez',
    'avatar/generated_image_1759590708945.png',
    'realistic/generated_image_1759590693839.png',
    'Imágenes generadas - Avatar y Realista'
);

-- Insertar múltiples empleados
INSERT INTO api_google.staff_employee (name, image_url_1, image_url_2, description)
VALUES
    ('Juan Pérez', 'avatar/generated_image_001.png', 'realistic/generated_image_001.png', 'CEO - Headshots corporativos'),
    ('María García', 'avatar/generated_image_002.png', 'realistic/generated_image_002.png', 'CTO - Fotos profesionales'),
    ('Carlos López', 'avatar/generated_image_003.png', 'realistic/generated_image_003.png', 'Desarrollador Senior');

-- ==========================================
-- 2. CONSULTAR EMPLEADOS
-- ==========================================

-- Obtener todos los empleados activos
SELECT id, name, image_url_1, image_url_2, description, created_at
FROM api_google.staff_employee
WHERE is_active = true
ORDER BY created_at DESC;

-- Obtener empleado por ID
SELECT * FROM api_google.staff_employee WHERE id = 1;

-- Buscar empleado por nombre
SELECT * FROM api_google.staff_employee
WHERE name ILIKE '%cristian%';

-- Obtener empleados con sus paths completos (para uso en Docker)
SELECT
    id,
    name,
    image_url_1,
    image_url_2,
    '/app/uploads/' || image_url_1 AS full_path_1,
    '/app/uploads/' || image_url_2 AS full_path_2,
    'http://localhost:8001/api/v1/uploads/' || image_url_1 AS served_url_1,
    'http://localhost:8001/api/v1/uploads/' || image_url_2 AS served_url_2
FROM api_google.staff_employee
WHERE is_active = true;

-- ==========================================
-- 3. ACTUALIZAR EMPLEADOS
-- ==========================================

-- Actualizar URLs de imágenes
UPDATE api_google.staff_employee
SET
    image_url_1 = 'avatar/generated_image_NEW_001.png',
    image_url_2 = 'realistic/generated_image_NEW_001.png'
WHERE id = 1;

-- Actualizar nombre y descripción
UPDATE api_google.staff_employee
SET
    name = 'Cristian Rodriguez (Actualizado)',
    description = 'Imágenes regeneradas con nuevo estilo'
WHERE id = 1;

-- Desactivar empleado (soft delete)
UPDATE api_google.staff_employee
SET is_active = false
WHERE id = 1;

-- Reactivar empleado
UPDATE api_google.staff_employee
SET is_active = true
WHERE id = 1;

-- ==========================================
-- 4. ELIMINAR EMPLEADOS
-- ==========================================

-- Eliminar empleado permanentemente (NO RECOMENDADO)
-- DELETE FROM api_google.staff_employee WHERE id = 1;

-- RECOMENDADO: Usar soft delete (is_active = false) en su lugar
UPDATE api_google.staff_employee SET is_active = false WHERE id = 1;

-- ==========================================
-- 5. QUERIES PARA N8N WORKFLOWS
-- ==========================================

-- Query para N8N: Obtener empleados activos con paths completos
-- Usar en nodo PostgreSQL de N8N
SELECT
    id,
    name,
    image_url_1,
    image_url_2,
    '/app/uploads/' || image_url_1 AS docker_path_1,
    '/app/uploads/' || image_url_2 AS docker_path_2,
    description
FROM api_google.staff_employee
WHERE is_active = true
ORDER BY id;

-- Query para N8N: Obtener solo URLs servidas (para APIs externas)
SELECT
    id,
    name,
    'http://localhost:8001/api/v1/uploads/' || image_url_1 AS image_url_1_full,
    'http://localhost:8001/api/v1/uploads/' || image_url_2 AS image_url_2_full
FROM api_google.staff_employee
WHERE is_active = true;

-- Query para N8N: Contar empleados activos
SELECT COUNT(*) AS total_employees
FROM api_google.staff_employee
WHERE is_active = true;

-- ==========================================
-- 6. QUERIES DE ADMINISTRACIÓN
-- ==========================================

-- Ver estructura de la tabla
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'api_google'
  AND table_name = 'staff_employee'
ORDER BY ordinal_position;

-- Ver índices de la tabla
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'api_google'
  AND tablename = 'staff_employee';

-- Ver triggers de la tabla
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'api_google'
  AND event_object_table = 'staff_employee';

-- Estadísticas de la tabla
SELECT
    COUNT(*) AS total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) AS active_records,
    COUNT(CASE WHEN is_active = false THEN 1 END) AS inactive_records,
    MIN(created_at) AS first_record,
    MAX(created_at) AS last_record
FROM api_google.staff_employee;

-- ==========================================
-- 7. EJEMPLO COMPLETO: WORKFLOW N8N
-- ==========================================

/*
FLUJO N8N PARA PROCESAMIENTO DE EMPLEADOS:

1. NODO PostgreSQL - Obtener empleados activos:
   Query: SELECT id, name, image_url_1, image_url_2 FROM api_google.staff_employee WHERE is_active = true;

2. NODO Function - Construir paths completos:
   const fullPath1 = `/app/uploads/${$json.image_url_1}`;
   const fullPath2 = `/app/uploads/${$json.image_url_2}`;
   return { ...item, fullPath1, fullPath2 };

3. NODO HTTP Request - Procesar imágenes con /api/v1/generate-image:
   POST http://api_google:8001/api/v1/generate-image
   Body:
   {
     "imagePrompt": "Combine these two images maintaining realistic style",
     "imageDataUrl": "{{ $json.fullPath1 }}",
     "imageDataUrl2": "{{ $json.fullPath2 }}",
     "mimeType": "image/png",
     "mimeType2": "image/png",
     "character_style": "realistic"
   }

4. NODO PostgreSQL - Actualizar con nueva imagen generada:
   UPDATE api_google.staff_employee
   SET description = 'Procesado en {{ $now.format("YYYY-MM-DD HH:mm:ss") }}'
   WHERE id = {{ $json.id }};
*/

-- ==========================================
-- 8. VACUUM Y MANTENIMIENTO
-- ==========================================

-- Analizar tabla para optimizar queries
ANALYZE api_google.staff_employee;

-- Vacuum para recuperar espacio
VACUUM api_google.staff_employee;

-- Reindexar tabla
REINDEX TABLE api_google.staff_employee;
