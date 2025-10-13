-- =====================================================
-- TABLA: content_formats (CORREGIDA)
-- Descripción: Relación muchos-a-muchos entre contenidos
-- y formatos (videos e imágenes) para generación
-- =====================================================

-- Primero, agregar columna format_type a content_generated si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'format_type'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN format_type VARCHAR(20) DEFAULT 'video' CHECK (format_type IN ('video', 'image'));
    END IF;
END $$;

-- Agregar columna image_format_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'image_format_id'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN image_format_id INTEGER REFERENCES image_formats(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Agregar columna is_primary si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN is_primary BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Agregar columna usage_context si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'usage_context'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN usage_context TEXT DEFAULT 'main_content';
    END IF;
END $$;

-- Agregar columna generation_params si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'generation_params'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN generation_params JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Agregar columna generation_error si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'generation_error'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN generation_error TEXT;
    END IF;
END $$;

-- Agregar columna generated_content_url si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_generated'
        AND column_name = 'generated_content_url'
    ) THEN
        ALTER TABLE content_generated ADD COLUMN generated_content_url VARCHAR(500);
    END IF;
END $$;

-- =====================================================
-- ÍNDICES para optimización de consultas
-- =====================================================

-- Índice para búsqueda por format_type
CREATE INDEX IF NOT EXISTS idx_content_generated_format_type
ON content_generated(format_type);

-- Índice para búsqueda por image_format_id
CREATE INDEX IF NOT EXISTS idx_content_generated_image_format_id
ON content_generated(image_format_id);

-- Índice para búsqueda por is_primary
CREATE INDEX IF NOT EXISTS idx_content_generated_is_primary
ON content_generated(is_primary)
WHERE is_primary = true;

-- =====================================================
-- COMENTARIOS en las columnas
-- =====================================================

COMMENT ON COLUMN content_generated.format_type IS 'Tipo de formato: video o image';
COMMENT ON COLUMN content_generated.format_id IS 'ID del formato de video (video_formats)';
COMMENT ON COLUMN content_generated.image_format_id IS 'ID del formato de imagen (image_formats)';
COMMENT ON COLUMN content_generated.is_primary IS 'Si es el formato principal para este contenido';
COMMENT ON COLUMN content_generated.usage_context IS 'Contexto de uso: main_content, thumbnail, social_media, etc.';
COMMENT ON COLUMN content_generated.generation_params IS 'Parámetros específicos para la generación (JSON)';
COMMENT ON COLUMN content_generated.generation_error IS 'Mensaje de error si falló la generación';
COMMENT ON COLUMN content_generated.generated_content_url IS 'URL del contenido generado';

-- =====================================================
-- FUNCIÓN para validar que el formato existe
-- =====================================================

CREATE OR REPLACE FUNCTION validate_content_format()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que el formato existe en la tabla correspondiente
    IF NEW.format_type = 'video' AND NEW.format_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM video_formats WHERE id = NEW.format_id) THEN
            RAISE EXCEPTION 'Video format with id % does not exist', NEW.format_id;
        END IF;
    ELSIF NEW.format_type = 'image' AND NEW.image_format_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM image_formats WHERE id = NEW.image_format_id) THEN
            RAISE EXCEPTION 'Image format with id % does not exist', NEW.image_format_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar formato
DROP TRIGGER IF EXISTS trigger_validate_content_format ON content_generated;
CREATE TRIGGER trigger_validate_content_format
BEFORE INSERT OR UPDATE ON content_generated
FOR EACH ROW
EXECUTE FUNCTION validate_content_format();

-- =====================================================
-- VISTAS para consultas rápidas
-- =====================================================

-- Vista de contenidos con sus formatos
CREATE OR REPLACE VIEW v_content_with_formats AS
SELECT
    cg.id AS content_id,
    cg.content_type,
    cg.status,
    cg.scheduled_date,
    cg.scheduled_time,
    cg.created_at AS content_created_at,
    cg.format_type,
    cg.is_primary,
    cg.usage_context,
    cg.file_path AS generated_content_url,
    cg.status AS generation_status,
    cg.preview_generated_at AS generated_at,
    CASE
        WHEN cg.format_type = 'video' AND cg.format_id IS NOT NULL THEN vf.format_name
        WHEN cg.format_type = 'image' AND cg.image_format_id IS NOT NULL THEN imgf.format_name
    END AS format_name,
    CASE
        WHEN cg.format_type = 'video' AND cg.format_id IS NOT NULL THEN vf.category
        WHEN cg.format_type = 'image' AND cg.image_format_id IS NOT NULL THEN imgf.category
    END AS format_category
FROM content_generated cg
LEFT JOIN video_formats vf ON cg.format_type = 'video' AND cg.format_id = vf.id
LEFT JOIN image_formats imgf ON cg.format_type = 'image' AND cg.image_format_id = imgf.id
WHERE cg.status != 'deleted'
ORDER BY cg.scheduled_date DESC, cg.is_primary DESC;

-- Vista de formatos más utilizados
CREATE OR REPLACE VIEW v_most_used_formats AS
SELECT
    'video' AS format_type,
    vf.id AS format_id,
    vf.format_name,
    vf.category AS format_category,
    COUNT(*) AS usage_count,
    COUNT(CASE WHEN cg.status = 'completed' THEN 1 END) AS successful_generations,
    COUNT(CASE WHEN cg.status = 'failed' THEN 1 END) AS failed_generations,
    ROUND(
        COUNT(CASE WHEN cg.status = 'completed' THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS success_rate
FROM content_generated cg
INNER JOIN video_formats vf ON cg.format_id = vf.id
WHERE cg.format_type = 'video'
GROUP BY vf.id, vf.format_name, vf.category

UNION ALL

SELECT
    'image' AS format_type,
    imgf.id AS format_id,
    imgf.format_name,
    imgf.category AS format_category,
    COUNT(*) AS usage_count,
    COUNT(CASE WHEN cg.status = 'completed' THEN 1 END) AS successful_generations,
    COUNT(CASE WHEN cg.status = 'failed' THEN 1 END) AS failed_generations,
    ROUND(
        COUNT(CASE WHEN cg.status = 'completed' THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS success_rate
FROM content_generated cg
INNER JOIN image_formats imgf ON cg.image_format_id = imgf.id
WHERE cg.format_type = 'image'
GROUP BY imgf.id, imgf.format_name, imgf.category

ORDER BY usage_count DESC;

-- Vista de contenidos pendientes de generación
CREATE OR REPLACE VIEW v_pending_content_generations AS
SELECT
    cg.id AS content_id,
    cg.content_type,
    cg.scheduled_date,
    cg.scheduled_time,
    cg.format_type,
    CASE
        WHEN cg.format_type = 'video' AND cg.format_id IS NOT NULL THEN vf.format_name
        WHEN cg.format_type = 'image' AND cg.image_format_id IS NOT NULL THEN imgf.format_name
    END AS format_name,
    cg.status AS generation_status,
    cg.created_at AS assigned_at,
    EXTRACT(EPOCH FROM (NOW() - cg.created_at)) / 60 AS minutes_pending
FROM content_generated cg
LEFT JOIN video_formats vf ON cg.format_type = 'video' AND cg.format_id = vf.id
LEFT JOIN image_formats imgf ON cg.format_type = 'image' AND cg.image_format_id = imgf.id
WHERE cg.status IN ('pending', 'processing')
ORDER BY cg.created_at ASC;

-- =====================================================
-- FUNCIÓN para asignar formato a contenido
-- =====================================================

CREATE OR REPLACE FUNCTION assign_format_to_content(
    p_content_id INTEGER,
    p_format_id INTEGER DEFAULT NULL,
    p_image_format_id INTEGER DEFAULT NULL,
    p_format_type VARCHAR(20) DEFAULT 'video',
    p_is_primary BOOLEAN DEFAULT true,
    p_usage_context TEXT DEFAULT 'main_content',
    p_generation_params JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER AS $$
DECLARE
    v_content_id INTEGER;
BEGIN
    -- Actualizar el contenido existente
    UPDATE content_generated
    SET
        format_id = COALESCE(p_format_id, format_id),
        image_format_id = COALESCE(p_image_format_id, image_format_id),
        format_type = p_format_type,
        is_primary = p_is_primary,
        usage_context = p_usage_context,
        generation_params = p_generation_params,
        updated_at = NOW()
    WHERE id = p_content_id
    RETURNING id INTO v_content_id;

    RETURN v_content_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
