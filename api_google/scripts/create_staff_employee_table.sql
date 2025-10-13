-- ==========================================
-- TABLA: staff_employee
-- Base de Datos: frontend_db
-- Esquema: api_google
-- Propósito: Almacenar empleados con imágenes generadas (avatar + realistic)
-- ==========================================

-- Crear tabla staff_employee
CREATE TABLE IF NOT EXISTS api_google.staff_employee (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,

    -- URLs relativas de imágenes generadas
    -- Ejemplo: "avatar/generated_image_1759590708945.png"
    -- Path completo: /app/uploads/{image_url_1}
    -- URL servida: http://localhost:8001/api/v1/uploads/{image_url_1}
    image_url_1 TEXT NOT NULL,  -- Primera imagen (ej: avatar style)
    image_url_2 TEXT NOT NULL,  -- Segunda imagen (ej: realistic style)

    -- Campos de control
    is_active BOOLEAN DEFAULT true,
    description TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_staff_employee_name ON api_google.staff_employee(name);
CREATE INDEX IF NOT EXISTS idx_staff_employee_active ON api_google.staff_employee(is_active);

-- Comentarios para documentación
COMMENT ON TABLE api_google.staff_employee IS 'Empleados con imágenes generadas en múltiples estilos (avatar + realistic)';
COMMENT ON COLUMN api_google.staff_employee.id IS 'ID único autoincremental';
COMMENT ON COLUMN api_google.staff_employee.name IS 'Nombre completo del empleado';
COMMENT ON COLUMN api_google.staff_employee.image_url_1 IS 'Ruta relativa primera imagen (ej: avatar/generated_image_xxx.png)';
COMMENT ON COLUMN api_google.staff_employee.image_url_2 IS 'Ruta relativa segunda imagen (ej: realistic/generated_image_xxx.png)';
COMMENT ON COLUMN api_google.staff_employee.is_active IS 'Empleado activo para procesamiento (true/false)';
COMMENT ON COLUMN api_google.staff_employee.description IS 'Descripción adicional o notas sobre el empleado';
COMMENT ON COLUMN api_google.staff_employee.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN api_google.staff_employee.updated_at IS 'Fecha y hora de última actualización';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION api_google.update_staff_employee_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_employee_updated_at
    BEFORE UPDATE ON api_google.staff_employee
    FOR EACH ROW
    EXECUTE FUNCTION api_google.update_staff_employee_timestamp();

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla api_google.staff_employee creada exitosamente';
END $$;
