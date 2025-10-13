-- ========================================
-- NUEVO ENFOQUE: Generation instead of Extraction
-- ========================================
-- Basado en documentación oficial de Google
-- Cambio de estrategia: NO extraer y colocar
-- NUEVA estrategia: GENERAR layout completo nuevo
-- ========================================

-- ==========================================
-- ID 2: FEMALE + PIXAR (Generation approach)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a complete Pixar 3D character design sheet showing the SAME woman in multiple professional poses.

REFERENCE IMAGES:
- IMAGE 1 provides the layout structure: headshot, full-body front view, and side profile arrangement
- IMAGE 2 shows the woman whose appearance you will use to create the Pixar character

CHARACTER TO GENERATE:
Create a Pixar-style 3D animated character based on the woman in IMAGE 2. She has specific facial features, hair color, hair length, and distinctive characteristics that must be transformed into Pixar cartoon style while remaining recognizable.

GENERATE COMPLETE LAYOUT:
Create a professional character design sheet in the style of Pixar Animation Studios with these poses:
1. Close-up headshot (upper left) - Large expressive eyes with emotional sparkle, soft rounded facial features
2. Full-body three-quarter view (upper right) - Character in professional outfit, appealing cartoon proportions
3. Full-body front view (lower left) - Complete character presentation
4. Close-up portrait (lower right) - Detailed facial features
5. Side profile view (bottom) - Character from side angle

PIXAR QUALITY STANDARDS:
- Rendering: High-quality 3D with subsurface scattering on skin, smooth gradient shading
- Lighting: Cinematic three-point lighting with soft ambient occlusion and rim lighting
- Materials: Pixar-signature shaders with subtle translucency, vibrant yet natural color palette
- Background: Clean professional gradient background typical of Pixar character sheets
- Style: Pure Pixar Animation Studios aesthetic throughout all poses

CRITICAL CONSISTENCY:
The SAME Pixar character appears in ALL five poses with identical facial features, hair color, hair style, skin tone, and outfit. Every pose must be pure Pixar 3D animation style with no photographic elements.',
    description = 'NUEVO ENFOQUE: Generación completa en lugar de extracción. Femenino Pixar.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 1: FEMALE + REALISTIC (Generation approach)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a complete professional photography portfolio showing the SAME woman in multiple studio poses.

REFERENCE IMAGES:
- IMAGE 1 provides the layout structure: headshot, full-body, and profile arrangement
- IMAGE 2 shows the woman whose appearance you will recreate in all poses

WOMAN TO PHOTOGRAPH:
Create professional studio photographs of the woman from IMAGE 2. She has specific facial features, hair color, hair length, skin tone, and distinctive characteristics that must appear identically in all poses.

GENERATE COMPLETE LAYOUT:
Create a professional photography portfolio with these studio shots:
1. Close-up headshot (upper left) - Professional portrait with sharp focus
2. Full-body three-quarter view (upper right) - Standing pose in professional attire
3. Full-body front view (lower left) - Complete frontal presentation
4. Close-up portrait (lower right) - Detailed facial shot
5. Side profile view (bottom) - Profile angle shot

PROFESSIONAL PHOTOGRAPHY STANDARDS:
- Lighting: Studio three-point lighting setup (key light, fill light, rim light)
- Camera: Shot with 50mm portrait lens at f/2.8 for professional bokeh
- Color: Commercial photography color grading with natural, accurate skin tones
- Background: Clean white studio backdrop with subtle gradient
- Quality: High-resolution commercial photography (1920x1080 minimum)
- Style: Professional studio photography throughout

CRITICAL CONSISTENCY:
The SAME woman appears in ALL five poses with identical facial features, hair color, hair style, skin tone, and outfit. Every pose must be professional studio photography with consistent lighting and quality.',
    description = 'NUEVO ENFOQUE: Generación completa en lugar de extracción. Femenino realistic.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

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
    END as status
FROM api_google.staff_format
WHERE id IN (1, 2)
ORDER BY id;
