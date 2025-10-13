-- =====================================================
-- TABLA: content_formats
-- Descripción: Relación muchos-a-muchos entre contenidos
-- y formatos (videos e imágenes) para generación
-- =====================================================

CREATE TABLE IF NOT EXISTS content_formats (
    -- ID único
    id SERIAL PRIMARY KEY,

    -- Relación con contenido (tabla existente)
    content_id INTEGER NOT NULL,

    -- Relación con formato (video o imagen)
    format_id INTEGER NOT NULL,
    format_type VARCHAR(20) NOT NULL CHECK (format_type IN ('video', 'image')),

    -- Metadata de la relación
    is_primary BOOLEAN DEFAULT false, -- Si es el formato principal para este contenido
    usage_context TEXT, -- Contexto de uso: "thumbnail", "main_content", "social_media", etc.

    -- Parámetros de generación
    generation_params JSONB DEFAULT '{}'::jsonb, -- Parámetros específicos para la generación

    -- Estado de generación
    generation_status VARCHAR(50) DEFAULT 'pending', -- "pending", "processing", "completed", "failed"
    generated_content_url VARCHAR(500), -- URL del contenido generado
    generation_error TEXT, -- Mensaje de error si falló

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    generated_at TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_content FOREIGN KEY (content_id)
        REFERENCES content(id) ON DELETE CASCADE,

    -- Índice único compuesto
    CONSTRAINT unique_content_format UNIQUE (content_id, format_id, format_type)
);

-- =====================================================
-- ÍNDICES para optimización de consultas
-- =====================================================

-- Índice para búsqueda por contenido
CREATE INDEX IF NOT EXISTS idx_content_formats_content_id
ON content_formats(content_id);

-- Índice para búsqueda por formato
CREATE INDEX IF NOT EXISTS idx_content_formats_format
ON content_formats(format_id, format_type);

-- Índice para búsqueda por estado de generación
CREATE INDEX IF NOT EXISTS idx_content_formats_generation_status
ON content_formats(generation_status);

-- Índice para búsqueda por formato principal
CREATE INDEX IF NOT EXISTS idx_content_formats_is_primary
ON content_formats(is_primary)
WHERE is_primary = true;

-- Índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_content_formats_content_format
ON content_formats(content_id, format_type, generation_status);

-- =====================================================
-- COMENTARIOS en la tabla y columnas
-- =====================================================

COMMENT ON TABLE content_formats IS 'Relación muchos-a-muchos entre contenidos y formatos (videos/imágenes)';
COMMENT ON COLUMN content_formats.content_id IS 'ID del contenido (tabla content)';
COMMENT ON COLUMN content_formats.format_id IS 'ID del formato (video_formats o image_formats)';
COMMENT ON COLUMN content_formats.format_type IS 'Tipo de formato: video o image';
COMMENT ON COLUMN content_formats.is_primary IS 'Si es el formato principal para este contenido';
COMMENT ON COLUMN content_formats.generation_params IS 'Parámetros específicos para la generación (JSON)';
COMMENT ON COLUMN content_formats.generation_status IS 'Estado de la generación: pending, processing, completed, failed';

-- =====================================================
-- FUNCIÓN para actualizar updated_at automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_content_formats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_content_formats_updated_at ON content_formats;
CREATE TRIGGER trigger_update_content_formats_updated_at
BEFORE UPDATE ON content_formats
FOR EACH ROW
EXECUTE FUNCTION update_content_formats_updated_at();

-- =====================================================
-- FUNCIÓN para validar que el formato existe
-- =====================================================

CREATE OR REPLACE FUNCTION validate_content_format()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que el formato existe en la tabla correspondiente
    IF NEW.format_type = 'video' THEN
        IF NOT EXISTS (SELECT 1 FROM video_formats WHERE id = NEW.format_id) THEN
            RAISE EXCEPTION 'Video format with id % does not exist', NEW.format_id;
        END IF;
    ELSIF NEW.format_type = 'image' THEN
        IF NOT EXISTS (SELECT 1 FROM image_formats WHERE id = NEW.format_id) THEN
            RAISE EXCEPTION 'Image format with id % does not exist', NEW.format_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar formato
DROP TRIGGER IF EXISTS trigger_validate_content_format ON content_formats;
CREATE TRIGGER trigger_validate_content_format
BEFORE INSERT OR UPDATE ON content_formats
FOR EACH ROW
EXECUTE FUNCTION validate_content_format();

-- =====================================================
-- VISTAS para consultas rápidas
-- =====================================================

-- Vista de contenidos con sus formatos
CREATE OR REPLACE VIEW v_content_with_formats AS
SELECT
    c.id AS content_id,
    c.title,
    c.content_type,
    c.status,
    c.scheduled_date,
    c.created_at AS content_created_at,
    cf.id AS content_format_id,
    cf.format_id,
    cf.format_type,
    cf.is_primary,
    cf.usage_context,
    cf.generation_status,
    cf.generated_content_url,
    cf.generated_at,
    CASE
        WHEN cf.format_type = 'video' THEN vf.format_name
        WHEN cf.format_type = 'image' THEN imgf.format_name
    END AS format_name,
    CASE
        WHEN cf.format_type = 'video' THEN vf.category
        WHEN cf.format_type = 'image' THEN imgf.category
    END AS format_category
FROM content c
LEFT JOIN content_formats cf ON c.id = cf.content_id
LEFT JOIN video_formats vf ON cf.format_type = 'video' AND cf.format_id = vf.id
LEFT JOIN image_formats imgf ON cf.format_type = 'image' AND cf.format_id = imgf.id
WHERE c.is_active = true
ORDER BY c.scheduled_date DESC, cf.is_primary DESC;

-- Vista de formatos más utilizados
CREATE OR REPLACE VIEW v_most_used_formats AS
SELECT
    format_type,
    format_id,
    CASE
        WHEN format_type = 'video' THEN vf.format_name
        WHEN format_type = 'image' THEN imgf.format_name
    END AS format_name,
    CASE
        WHEN format_type = 'video' THEN vf.category
        WHEN format_type = 'image' THEN imgf.category
    END AS format_category,
    COUNT(*) AS usage_count,
    COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) AS successful_generations,
    COUNT(CASE WHEN generation_status = 'failed' THEN 1 END) AS failed_generations,
    ROUND(
        COUNT(CASE WHEN generation_status = 'completed' THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS success_rate
FROM content_formats cf
LEFT JOIN video_formats vf ON cf.format_type = 'video' AND cf.format_id = vf.id
LEFT JOIN image_formats imgf ON cf.format_type = 'image' AND cf.format_id = imgf.id
GROUP BY format_type, format_id, vf.format_name, imgf.format_name, vf.category, imgf.category
ORDER BY usage_count DESC;

-- Vista de contenidos pendientes de generación
CREATE OR REPLACE VIEW v_pending_content_generations AS
SELECT
    c.id AS content_id,
    c.title,
    c.content_type,
    c.scheduled_date,
    cf.id AS content_format_id,
    cf.format_type,
    CASE
        WHEN cf.format_type = 'video' THEN vf.format_name
        WHEN cf.format_type = 'image' THEN imgf.format_name
    END AS format_name,
    cf.generation_status,
    cf.created_at AS assigned_at,
    EXTRACT(EPOCH FROM (NOW() - cf.created_at)) / 60 AS minutes_pending
FROM content c
INNER JOIN content_formats cf ON c.id = cf.content_id
LEFT JOIN video_formats vf ON cf.format_type = 'video' AND cf.format_id = vf.id
LEFT JOIN image_formats imgf ON cf.format_type = 'image' AND cf.format_id = imgf.id
WHERE cf.generation_status IN ('pending', 'processing')
AND c.is_active = true
ORDER BY cf.created_at ASC;

-- =====================================================
-- FUNCIÓN para asignar formato a contenido
-- =====================================================

CREATE OR REPLACE FUNCTION assign_format_to_content(
    p_content_id INTEGER,
    p_format_id INTEGER,
    p_format_type VARCHAR(20),
    p_is_primary BOOLEAN DEFAULT false,
    p_usage_context TEXT DEFAULT NULL,
    p_generation_params JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER AS $$
DECLARE
    v_content_format_id INTEGER;
BEGIN
    -- Insertar la relación
    INSERT INTO content_formats (
        content_id,
        format_id,
        format_type,
        is_primary,
        usage_context,
        generation_params,
        generation_status
    ) VALUES (
        p_content_id,
        p_format_id,
        p_format_type,
        p_is_primary,
        p_usage_context,
        p_generation_params,
        'pending'
    )
    ON CONFLICT (content_id, format_id, format_type)
    DO UPDATE SET
        is_primary = EXCLUDED.is_primary,
        usage_context = EXCLUDED.usage_context,
        generation_params = EXCLUDED.generation_params,
        updated_at = NOW()
    RETURNING id INTO v_content_format_id;

    RETURN v_content_format_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN para actualizar estado de generación
-- =====================================================

CREATE OR REPLACE FUNCTION update_generation_status(
    p_content_format_id INTEGER,
    p_status VARCHAR(50),
    p_generated_url VARCHAR(500) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE content_formats
    SET
        generation_status = p_status,
        generated_content_url = COALESCE(p_generated_url, generated_content_url),
        generation_error = COALESCE(p_error_message, generation_error),
        generated_at = CASE
            WHEN p_status = 'completed' THEN NOW()
            ELSE generated_at
        END,
        updated_at = NOW()
    WHERE id = p_content_format_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Ejemplo de uso:
-- SELECT assign_format_to_content(
--     1, -- content_id
--     1, -- format_id
--     'video', -- format_type
--     true, -- is_primary
--     'main_content', -- usage_context
--     '{"duration": 30, "resolution": "1080p"}'::jsonb -- generation_params
-- );

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
