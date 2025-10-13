-- ========================================
-- ENFORCE FULL TRANSFORMATION: Prompts reforzados para evitar mezcla de estilos
-- ========================================
-- Problema identificado: El modelo mezcla Pixar + fotos reales en el mismo output
-- Solución: Reforzar que TODAS las poses deben transformarse completamente
-- ========================================

-- ==========================================
-- ID 2: FEMALE + PIXAR (Reforzado)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Transform the woman from IMAGE 2 into a complete Pixar 3D character and replicate her across EVERY SINGLE pose in IMAGE 1. CRITICAL: Replace ALL photographic poses with Pixar cartoon versions - no mixing of styles.

SCENE DESCRIPTION:
IMAGE 1 contains a multi-pose photographic layout. DO NOT preserve these photographs. Use only the pose structure (headshot, full-body, side view) as reference for positioning.

IMAGE 2 shows the woman to transform into Pixar style. Her identity becomes the Pixar character appearing in all poses.

ARTISTIC INTENTION:
Create a pure Pixar character sheet where the SAME 3D cartoon character appears in EVERY pose from IMAGE 1''s layout. The entire composition must be Pixar animation style - absolutely no photographic elements remaining.

PIXAR TRANSFORMATION (ALL POSES):
- Character design: Large expressive eyes with sparkle, soft rounded features, appealing cartoon proportions
- Rendering: 3D subsurface scattering, smooth gradient shading, professional Pixar quality
- Lighting: Cinematic three-point lighting with soft ambient occlusion
- Materials: Pixar shaders with subtle translucency, vibrant natural colors
- Background: Clean gradient matching Pixar character sheets

CONSISTENCY REQUIREMENT:
The SAME Pixar character from IMAGE 2 appears in ALL poses with identical cartoon features, coloring, and styling. EVERY pose must be pure Pixar 3D - no realistic photos allowed.

CRITICAL RULES:
- Transform EVERY pose to Pixar style - no exceptions
- Remove ALL photographic content from IMAGE 1
- Use IMAGE 1 only for pose arrangement
- Complete Pixar transformation of IMAGE 2''s woman
- NO mixing realistic and cartoon styles',
    description = 'Prompt REFORZADO femenino Pixar. Énfasis en transformación completa de TODAS las poses sin mezcla.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 4: MALE + PIXAR (Reforzado)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Transform the person from IMAGE 2 into a complete Pixar 3D character and replicate them across EVERY SINGLE pose in IMAGE 1. CRITICAL: Replace ALL photographic poses with Pixar cartoon versions - no mixing of styles.

SCENE DESCRIPTION:
IMAGE 1 contains a multi-pose photographic layout. DO NOT preserve these photographs. Use only the pose structure (headshot, full-body, side view) as reference for positioning.

IMAGE 2 shows the person to transform into Pixar style. Their identity becomes the Pixar character appearing in all poses.

ARTISTIC INTENTION:
Create a pure Pixar character sheet where the SAME 3D cartoon character appears in EVERY pose from IMAGE 1''s layout. The entire composition must be Pixar animation style - absolutely no photographic elements remaining.

PIXAR TRANSFORMATION (ALL POSES):
- Character design: Large expressive eyes with emotional depth, soft rounded features, appealing cartoon proportions
- Rendering: 3D subsurface scattering, smooth gradient shading, professional Pixar quality
- Lighting: Cinematic three-point lighting with soft ambient occlusion
- Materials: Pixar shaders with subtle translucency, vibrant natural colors
- Background: Clean gradient matching Pixar character sheets

CONSISTENCY REQUIREMENT:
The SAME Pixar character from IMAGE 2 appears in ALL poses with identical cartoon features, coloring, and styling. EVERY pose must be pure Pixar 3D - no realistic photos allowed.

CRITICAL RULES:
- Transform EVERY pose to Pixar style - no exceptions
- Remove ALL photographic content from IMAGE 1
- Use IMAGE 1 only for pose arrangement
- Complete Pixar transformation of IMAGE 2''s person
- NO mixing realistic and cartoon styles',
    description = 'Prompt REFORZADO masculino Pixar. Énfasis en transformación completa de TODAS las poses sin mezcla.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 4;

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
SELECT
    id,
    gender,
    character_style,
    LENGTH(imagePrompt) as length,
    CASE
        WHEN LENGTH(imagePrompt) <= 2048 THEN '✅ OK'
        ELSE '❌ TOO LONG'
    END as status,
    is_active
FROM api_google.staff_format
WHERE character_style = 'pixar'
ORDER BY gender;
