-- =====================================================
-- TABLA: image_formats
-- Descripción: Almacena formatos de imágenes analizados
-- para replicación y generación de contenidos
-- =====================================================

CREATE TABLE IF NOT EXISTS image_formats (
    -- ID y metadata básica
    id SERIAL PRIMARY KEY,
    format_name VARCHAR(255) NOT NULL,
    description TEXT,
    reference_image_path VARCHAR(500),

    -- Análisis técnico de la imagen
    image_width INTEGER,
    image_height INTEGER,
    aspect_ratio VARCHAR(20), -- "16:9", "1:1", "4:3", "9:16", "21:9"
    file_format VARCHAR(10), -- "PNG", "JPG", "WEBP", "SVG"
    file_size_bytes BIGINT,
    color_space VARCHAR(50), -- "RGB", "CMYK", "sRGB"
    dpi INTEGER,

    -- Análisis de composición
    composition_style VARCHAR(100), -- "centered", "grid", "asymmetric", "rule_of_thirds"
    focal_points TEXT, -- JSON: ["center", "top-left", "bottom-right"]
    visual_hierarchy TEXT, -- Descripción de jerarquía visual

    -- Análisis de color
    color_palette TEXT, -- JSON: [{"color": "#FF0000", "percentage": 30}, ...]
    color_scheme VARCHAR(50), -- "monochromatic", "complementary", "triadic", "analogous"
    contrast_level VARCHAR(50), -- "high", "medium", "low"
    saturation_level VARCHAR(50), -- "vibrant", "muted", "desaturated"

    -- Análisis de estilo visual
    visual_style TEXT, -- Descripción completa del estilo
    lighting_style VARCHAR(100), -- "natural", "dramatic", "soft", "harsh"
    artistic_style VARCHAR(100), -- "realistic", "illustrative", "minimalist", "abstract"

    -- Análisis de contenido
    content_type VARCHAR(100), -- "promotional", "informative", "educational", "social"
    target_audience TEXT, -- Descripción del público objetivo
    key_message TEXT, -- Mensaje principal
    has_text BOOLEAN DEFAULT false,
    text_style TEXT, -- Si tiene texto: "bold_sans_serif", "elegant_serif", etc.
    has_cta BOOLEAN DEFAULT false,
    cta_text TEXT, -- Texto del call-to-action si existe

    -- Elementos de diseño
    typography_analysis TEXT, -- Análisis de tipografía
    iconography TEXT, -- Descripción de iconos y símbolos
    shapes_patterns TEXT, -- Descripción de formas y patrones
    spacing_analysis TEXT, -- Análisis de espaciado

    -- Replicación con IA
    replication_prompt TEXT, -- Prompt optimizado para generar imágenes similares
    negative_prompt TEXT, -- Qué evitar al replicar
    recommended_ai_model VARCHAR(100), -- "dall-e-3", "midjourney", "stable-diffusion", "veo-3"
    recommended_resolution VARCHAR(50), -- "1024x1024", "1920x1080", "1080x1920"
    recommended_aspect_ratio VARCHAR(20), -- "1:1", "16:9", "9:16"
    recommended_quality VARCHAR(50), -- "standard", "hd", "ultra"

    -- Metadata y categorización
    category VARCHAR(100), -- "social-media", "marketing", "product", "infographic", "banner"
    tags TEXT, -- JSON array: ["promotional", "modern", "minimalist"]
    use_case TEXT, -- Casos de uso específicos

    -- Estadísticas de uso
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje de éxito en replicaciones

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- =====================================================
-- ÍNDICES para optimización de consultas
-- =====================================================

-- Índice para búsqueda por categoría
CREATE INDEX IF NOT EXISTS idx_image_formats_category
ON image_formats(category)
WHERE is_active = true;

-- Índice para búsqueda por tipo de contenido
CREATE INDEX IF NOT EXISTS idx_image_formats_content_type
ON image_formats(content_type)
WHERE is_active = true;

-- Índice para búsqueda por estilo artístico
CREATE INDEX IF NOT EXISTS idx_image_formats_artistic_style
ON image_formats(artistic_style)
WHERE is_active = true;

-- Índice para búsqueda por modelo de IA recomendado
CREATE INDEX IF NOT EXISTS idx_image_formats_ai_model
ON image_formats(recommended_ai_model)
WHERE is_active = true;

-- Índice para búsqueda por nombre de formato
CREATE INDEX IF NOT EXISTS idx_image_formats_format_name
ON image_formats(format_name);

-- =====================================================
-- COMENTARIOS en la tabla y columnas
-- =====================================================

COMMENT ON TABLE image_formats IS 'Almacena formatos de imágenes analizados para replicación y generación de contenidos';
COMMENT ON COLUMN image_formats.format_name IS 'Nombre descriptivo del formato';
COMMENT ON COLUMN image_formats.replication_prompt IS 'Prompt optimizado para generar imágenes similares con IA';
COMMENT ON COLUMN image_formats.recommended_ai_model IS 'Modelo de IA recomendado para replicar este formato';
COMMENT ON COLUMN image_formats.success_rate IS 'Porcentaje de éxito en replicaciones (0-100)';

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Insertar formato de ejemplo
INSERT INTO image_formats (
    format_name,
    description,
    aspect_ratio,
    file_format,
    composition_style,
    color_scheme,
    visual_style,
    content_type,
    target_audience,
    has_text,
    has_cta,
    recommended_ai_model,
    recommended_resolution,
    recommended_aspect_ratio,
    category,
    tags,
    is_active,
    is_template
) VALUES (
    'Modern Minimalist Promotional',
    'Formato promocional moderno con diseño minimalista, colores vibrantes y tipografía bold',
    '16:9',
    'PNG',
    'centered',
    'complementary',
    'Modern minimalist design with vibrant colors and bold typography',
    'promotional',
    'Business professionals and entrepreneurs',
    true,
    true,
    'dall-e-3',
    '1920x1080',
    '16:9',
    'marketing',
    '["promotional", "modern", "minimalist", "business"]',
    true,
    true
) ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCIÓN para actualizar updated_at automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_image_formats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_image_formats_updated_at ON image_formats;
CREATE TRIGGER trigger_update_image_formats_updated_at
BEFORE UPDATE ON image_formats
FOR EACH ROW
EXECUTE FUNCTION update_image_formats_updated_at();

-- =====================================================
-- VISTA para consultas rápidas
-- =====================================================

CREATE OR REPLACE VIEW v_active_image_formats AS
SELECT
    id,
    format_name,
    description,
    aspect_ratio,
    content_type,
    category,
    recommended_ai_model,
    usage_count,
    success_rate,
    created_at,
    updated_at
FROM image_formats
WHERE is_active = true
ORDER BY usage_count DESC, created_at DESC;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
