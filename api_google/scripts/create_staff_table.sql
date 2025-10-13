-- Crear tabla staff_format en esquema api_google
-- Base de datos: frontend_db
-- Esquema: api_google
-- Fecha: 2025-10-03

-- Asegurar que el esquema api_google existe
CREATE SCHEMA IF NOT EXISTS api_google;

-- Crear tabla staff_format en el esquema api_google
CREATE TABLE IF NOT EXISTS api_google.staff_format (
    id SERIAL PRIMARY KEY,
    character_style VARCHAR(50) NOT NULL,
    imagePrompt TEXT NOT NULL,
    temperature FLOAT DEFAULT 0.7,
    maxOutputTokens INTEGER DEFAULT 2048,
    imageDataUrl2 VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para búsquedas por estilo activo
CREATE INDEX IF NOT EXISTS idx_staff_format_active_style ON api_google.staff_format(character_style, is_active);

-- Insertar datos iniciales (2 registros: realistic y pixar)
INSERT INTO api_google.staff_format (character_style, imagePrompt, temperature, maxOutputTokens, imageDataUrl2, is_active, description)
VALUES
(
    'realistic',
    'TASK: Replace the character from image 2 with the character from image 1, maintaining the layout, outfit, and professional photographic quality.

STEP 1 - CHARACTER REPLACEMENT:
- Use the woman from the FIRST image as the primary subject
- Place her exactly where the character appears in the SECOND image layout
- Keep her outfit from image 1 (Security jacket/uniform)
- Preserve her exact facial features, skin tone, and hairstyle

STEP 2 - PROFESSIONAL ENHANCEMENT:
- Enhance to professional photographic quality
- Studio-quality lighting and color grading
- Sharp focus on the subject
- Professional background blur (bokeh effect)
- High-resolution output (1024x1024 minimum)
- Natural skin tones and realistic textures

CRITICAL CONSTRAINTS:
- DO NOT ALTER the woman''s facial features, identity, or skin tone
- DO NOT change her outfit from image 1
- MAINTAIN the composition and framing from image 2
- KEEP professional photographic realism throughout
- ENSURE seamless integration into the layout',
    0.45,
    2048,
    '/uploads/banana/test/generated_image_1759433366186.png',
    true,
    'Template para fusión fotográfica realista con alta coherencia (temperature=0.45). Reemplaza personaje de imagen 2 con personaje de imagen 1 manteniendo layout profesional.'
),
(
    'pixar',
    'TASK: Replace the character from image 2 with the character from image 1, transforming into Pixar-style 3D cartoon character while maintaining the layout and outfit.

STEP 1 - CHARACTER REPLACEMENT:
- Use the woman from the FIRST image as the primary subject
- Place her exactly where the character appears in the SECOND image layout
- Keep her outfit from image 1 (Security jacket/uniform)
- Transform her into a Pixar-style cartoon character

STEP 2 - PIXAR STYLE TRANSFORMATION:
- Expressive large eyes with emotional depth
- Smooth stylized facial features
- Vibrant colors and soft lighting
- High-quality 3D rendering with professional Pixar aesthetic
- Soft shadows and ambient lighting
- Cartoon proportions while maintaining character identity

STEP 3 - PROFESSIONAL ENHANCEMENT:
- Studio-quality Pixar animation aesthetic
- Sharp details and smooth textures
- Professional background integration
- High-resolution output (1024x1024 minimum)
- Cinematic lighting setup

CRITICAL CONSTRAINTS:
- MAINTAIN the character''s identity and recognizability
- DO NOT change her outfit from image 1
- PRESERVE the composition and framing from image 2
- KEEP consistent Pixar animation style throughout
- ENSURE seamless integration into the Pixar-style layout',
    0.55,
    2048,
    '/uploads/banana/test/generated_image_1759433366186.png',
    true,
    'Template para transformación estilo Pixar cartoon (temperature=0.55). Reemplaza personaje de imagen 2 con versión Pixar del personaje de imagen 1 manteniendo layout.'
);

-- Comentarios sobre la tabla
COMMENT ON TABLE api_google.staff_format IS 'Plantillas de prompts para generación de imágenes con diferentes estilos de personaje';
COMMENT ON COLUMN api_google.staff_format.character_style IS 'Estilo del personaje: realistic (foto real) o pixar (cartoon 3D)';
COMMENT ON COLUMN api_google.staff_format.imagePrompt IS 'Prompt completo predefinido para el estilo';
COMMENT ON COLUMN api_google.staff_format.temperature IS 'Temperatura específica para el estilo (0.0-2.0)';
COMMENT ON COLUMN api_google.staff_format.maxOutputTokens IS 'Máximo de tokens de salida para el estilo';
COMMENT ON COLUMN api_google.staff_format.imageDataUrl2 IS 'Ruta relativa a imagen de referencia (layout/background)';
COMMENT ON COLUMN api_google.staff_format.is_active IS 'Indica si el template está activo para uso en workflows';
COMMENT ON COLUMN api_google.staff_format.description IS 'Descripción del template y su uso';
