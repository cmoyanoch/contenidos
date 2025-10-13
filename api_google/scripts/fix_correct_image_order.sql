-- ========================================
-- FIX: Orden REAL de imágenes detectado por debug
-- ========================================
-- ORDEN REAL en N8N:
--   IMAGE 1 (imageDataUrl)  = dos.jpeg (persona - image/jpeg)
--   IMAGE 2 (imageDataUrl2) = formato.png (layout - image/png)
--
-- Los prompts deben usar:
--   IMAGE 1 = persona objetivo
--   IMAGE 2 = layout multi-pose
-- ========================================

-- ==========================================
-- ID 1: FEMALE + REALISTIC
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a professional photography portfolio showing the SAME woman from IMAGE 1 in multiple studio poses using the layout structure from IMAGE 2.

REFERENCE IMAGES:
- IMAGE 1 shows the woman whose appearance you will recreate in all poses
- IMAGE 2 provides the layout structure: headshot, full-body, and profile arrangement

WOMAN TO PHOTOGRAPH:
Create professional studio photographs of the woman from IMAGE 1. She has specific facial features, hair color, hair length, skin tone, and distinctive characteristics that must appear identically in all poses.

GENERATE COMPLETE LAYOUT:
Create a professional photography portfolio matching IMAGE 2 structure with these studio shots:
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
The SAME woman from IMAGE 1 appears in ALL five poses with identical facial features, hair color, hair style, skin tone, and outfit. Every pose must be professional studio photography with consistent lighting and quality.',
    description = 'Prompt CORREGIDO para orden real (IMAGE 1=persona jpeg, IMAGE 2=layout png). Femenino realistic.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- ==========================================
-- ID 2: FEMALE + PIXAR
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a Pixar 3D character design sheet showing the SAME woman from IMAGE 1 in multiple poses using the layout structure from IMAGE 2.

REFERENCE IMAGES:
- IMAGE 1 shows the woman whose appearance you will use to create the Pixar character
- IMAGE 2 provides the layout structure: headshot, full-body front view, and side profile arrangement

CHARACTER TO GENERATE:
Create a Pixar-style 3D animated character based on the woman in IMAGE 1. She has specific facial features, hair color, hair length, and distinctive characteristics that must be transformed into Pixar cartoon style while remaining recognizable.

GENERATE COMPLETE LAYOUT:
Create a professional Pixar character sheet matching IMAGE 2 structure with these poses:
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
The SAME Pixar character based on IMAGE 1 woman appears in ALL five poses with identical facial features, hair color, hair style, skin tone, and outfit. Every pose must be pure Pixar 3D animation style with no photographic elements.',
    description = 'Prompt CORREGIDO para orden real (IMAGE 1=persona jpeg, IMAGE 2=layout png). Femenino Pixar.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 3: MALE + REALISTIC
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a professional photography portfolio showing the SAME person from IMAGE 1 in multiple studio poses using the layout structure from IMAGE 2.

REFERENCE IMAGES:
- IMAGE 1 shows the person whose appearance you will recreate in all poses
- IMAGE 2 provides the layout structure: headshot, full-body, and profile arrangement

PERSON TO PHOTOGRAPH:
Create professional studio photographs of the person from IMAGE 1. They have specific facial features, hair color, hair length, skin tone, and distinctive characteristics that must appear identically in all poses.

GENERATE COMPLETE LAYOUT:
Create a professional photography portfolio matching IMAGE 2 structure with these studio shots:
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
The SAME person from IMAGE 1 appears in ALL five poses with identical facial features, hair color, hair style, skin tone, and outfit. Every pose must be professional studio photography with consistent lighting and quality.',
    description = 'Prompt CORREGIDO para orden real (IMAGE 1=persona jpeg, IMAGE 2=layout png). Masculino realistic.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- ==========================================
-- ID 4: MALE + PIXAR
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a Pixar 3D character design sheet showing the SAME person from IMAGE 1 in multiple poses using the layout structure from IMAGE 2.

REFERENCE IMAGES:
- IMAGE 1 shows the person whose appearance you will use to create the Pixar character
- IMAGE 2 provides the layout structure: headshot, full-body front view, and side profile arrangement

CHARACTER TO GENERATE:
Create a Pixar-style 3D animated character based on the person in IMAGE 1. They have specific facial features, hair color, hair length, and distinctive characteristics that must be transformed into Pixar cartoon style while remaining recognizable.

GENERATE COMPLETE LAYOUT:
Create a professional Pixar character sheet matching IMAGE 2 structure with these poses:
1. Close-up headshot (upper left) - Large expressive eyes with emotional depth, soft rounded facial features
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
The SAME Pixar character based on IMAGE 1 person appears in ALL five poses with identical facial features, hair color, hair style, skin tone, and outfit. Every pose must be pure Pixar 3D animation style with no photographic elements.',
    description = 'Prompt CORREGIDO para orden real (IMAGE 1=persona jpeg, IMAGE 2=layout png). Masculino Pixar.',
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
    description
FROM api_google.staff_format
ORDER BY gender, character_style;
