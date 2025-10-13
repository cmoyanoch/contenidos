-- Consultas SQL para uso en N8N workflows
-- Base de datos: frontend_db
-- Esquema: api_google

-- 1. Obtener todos los templates activos
SELECT
    id,
    character_style,
    imagePrompt,
    temperature,
    maxOutputTokens,
    imageDataUrl2,
    description
FROM api_google.staff_format
WHERE is_active = true
ORDER BY character_style;

-- 2. Obtener solo template realistic activo
SELECT
    id,
    character_style,
    imagePrompt,
    temperature,
    maxOutputTokens,
    imageDataUrl2,
    description
FROM api_google.staff_format
WHERE is_active = true
  AND character_style = 'realistic';

-- 3. Obtener solo template pixar activo
SELECT
    id,
    character_style,
    imagePrompt,
    temperature,
    maxOutputTokens,
    imageDataUrl2,
    description
FROM api_google.staff_format
WHERE is_active = true
  AND character_style = 'pixar';

-- 4. Contar templates activos por estilo
SELECT
    character_style,
    COUNT(*) as total_templates
FROM api_google.staff_format
WHERE is_active = true
GROUP BY character_style;

-- 5. Obtener template específico por ID
SELECT
    id,
    character_style,
    imagePrompt,
    temperature,
    maxOutputTokens,
    imageDataUrl2,
    description
FROM api_google.staff_format
WHERE id = 1;  -- Cambiar ID según necesidad
