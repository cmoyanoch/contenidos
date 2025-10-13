-- ========================================
-- FIX IMAGE ORDER: Actualizar prompts para nuevo orden de imágenes
-- ========================================
-- CAMBIO EN API: Ahora se envían en orden invertido
--   - FIRST image  = imageDataUrl2 (persona objetivo)
--   - SECOND image = imageDataUrl  (layout multi-pose)
--
-- Los prompts deben actualizarse para referenciar correctamente
-- ========================================

-- ==========================================
-- ID 1: FEMALE + REALISTIC
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Create a professional multi-pose composition by extracting the woman from the FIRST image and replicating her across all poses in the SECOND image layout.

SCENE DESCRIPTION:
FIRST image contains the woman to replicate - her identity, features, and appearance must be preserved entirely.

SECOND image shows a multi-pose professional layout (headshot, full-body, side view). Use this layout structure for pose arrangement only.

ARTISTIC INTENTION:
Generate a cohesive portrait series where the woman from FIRST image appears naturally in each pose defined by SECOND image layout, as if she had a professional session in that studio setup.

PHOTOGRAPHIC EXECUTION:
- Studio lighting: Three-point setup (key, fill, rim lights)
- Camera: 50mm portrait lens perspective per pose
- Color grading: Commercial photography with natural skin tones
- Background: Clean studio backdrop with gradient
- Focus: Sharp subject with professional bokeh
- Resolution: High-resolution quality (1920x1080+)

CONSISTENCY:
The woman from FIRST image appears identically across all poses - same facial features, skin tone, hair, and outfit naturally adapted to each position.

CRITICAL RULES:
Use FIRST image subject exclusively. Use SECOND image layout structure only. Maintain photorealistic commercial standards throughout.',
    description = 'Prompt CORREGIDO orden de imágenes. Femenino realistic (FIRST=sujeto, SECOND=layout).',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- ==========================================
-- ID 2: FEMALE + PIXAR
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Transform the woman from FIRST image into Pixar 3D character and replicate across EVERY pose in SECOND image layout. CRITICAL: Replace ALL poses with Pixar style - no mixing.

SCENE DESCRIPTION:
FIRST image shows the woman to transform into Pixar character.

SECOND image contains multi-pose layout. DO NOT preserve these photos. Use pose structure only (headshot, full-body, side view).

ARTISTIC INTENTION:
Create pure Pixar character sheet where the SAME 3D character appears in EVERY pose from SECOND image layout. Entire composition must be Pixar animation - no photographic elements remaining.

PIXAR TRANSFORMATION (ALL POSES):
- Character: Large expressive eyes with sparkle, soft rounded features, appealing proportions
- Rendering: 3D subsurface scattering, smooth gradient shading, professional Pixar quality
- Lighting: Cinematic three-point with soft ambient occlusion
- Materials: Pixar shaders with subtle translucency, vibrant natural colors
- Background: Clean gradient matching Pixar character sheets

CONSISTENCY:
SAME Pixar character from FIRST image in ALL poses with identical cartoon features, coloring, styling. EVERY pose pure Pixar 3D - no realistic photos.

CRITICAL RULES:
Transform EVERY pose to Pixar - no exceptions. Remove ALL photographic content. Use SECOND image for pose arrangement only. NO mixing styles.',
    description = 'Prompt CORREGIDO orden de imágenes. Femenino Pixar (FIRST=sujeto, SECOND=layout).',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 3: MALE + REALISTIC
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Create a professional multi-pose composition by extracting the person from the FIRST image and replicating them across all poses in the SECOND image layout.

SCENE DESCRIPTION:
FIRST image contains the person to replicate - their identity, features, and appearance must be preserved entirely.

SECOND image shows a multi-pose professional layout (headshot, full-body, side view). Use this layout structure for pose arrangement only.

ARTISTIC INTENTION:
Generate a cohesive portrait series where the person from FIRST image appears naturally in each pose defined by SECOND image layout, as if they had a professional session in that studio setup.

PHOTOGRAPHIC EXECUTION:
- Studio lighting: Three-point setup (key, fill, rim lights)
- Camera: 50mm portrait lens perspective per pose
- Color grading: Commercial photography with natural skin tones
- Background: Clean studio backdrop with gradient
- Focus: Sharp subject with professional bokeh
- Resolution: High-resolution quality (1920x1080+)

CONSISTENCY:
The person from FIRST image appears identically across all poses - same facial features, skin tone, hair, and outfit naturally adapted to each position.

CRITICAL RULES:
Use FIRST image subject exclusively. Use SECOND image layout structure only. Maintain photorealistic commercial standards throughout.',
    description = 'Prompt CORREGIDO orden de imágenes. Masculino realistic (FIRST=sujeto, SECOND=layout).',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- ==========================================
-- ID 4: MALE + PIXAR
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Transform the person from FIRST image into Pixar 3D character and replicate across EVERY pose in SECOND image layout. CRITICAL: Replace ALL poses with Pixar style - no mixing.

SCENE DESCRIPTION:
FIRST image shows the person to transform into Pixar character.

SECOND image contains multi-pose layout. DO NOT preserve these photos. Use pose structure only (headshot, full-body, side view).

ARTISTIC INTENTION:
Create pure Pixar character sheet where the SAME 3D character appears in EVERY pose from SECOND image layout. Entire composition must be Pixar animation - no photographic elements remaining.

PIXAR TRANSFORMATION (ALL POSES):
- Character: Large expressive eyes with emotional depth, soft rounded features, appealing proportions
- Rendering: 3D subsurface scattering, smooth gradient shading, professional Pixar quality
- Lighting: Cinematic three-point with soft ambient occlusion
- Materials: Pixar shaders with subtle translucency, vibrant natural colors
- Background: Clean gradient matching Pixar character sheets

CONSISTENCY:
SAME Pixar character from FIRST image in ALL poses with identical cartoon features, coloring, styling. EVERY pose pure Pixar 3D - no realistic photos.

CRITICAL RULES:
Transform EVERY pose to Pixar - no exceptions. Remove ALL photographic content. Use SECOND image for pose arrangement only. NO mixing styles.',
    description = 'Prompt CORREGIDO orden de imágenes. Masculino Pixar (FIRST=sujeto, SECOND=layout).',
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
    is_active,
    LEFT(description, 70) as desc
FROM api_google.staff_format
ORDER BY gender, character_style;
