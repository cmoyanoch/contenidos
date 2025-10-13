-- ========================================
-- GOOGLE-OPTIMIZED PROMPTS (Según documentación oficial)
-- ========================================
-- Basado en: https://ai.google.dev/gemini-api/docs/image-generation
-- Mejoras aplicadas:
--   1. Lenguaje narrativo/descriptivo (no keywords)
--   2. Contexto cinematográfico/fotográfico rico
--   3. Intención artística clara
--   4. Template de composición avanzada de Google
-- ========================================

-- ==========================================
-- ID 1: FEMALE + REALISTIC (Google-optimized)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Create a professional multi-pose photographic composition by extracting the woman from IMAGE 2 and seamlessly integrating her into the studio layout shown in IMAGE 1.

SCENE DESCRIPTION:
IMAGE 1 presents a professional studio photography layout featuring multiple poses (headshot, full-body portrait, three-quarter view, side profile). This layout serves as the compositional template with its professional lighting setup, clean white background, and commercial photography aesthetic.

IMAGE 2 contains the primary subject - a woman whose identity, facial features, and personal characteristics must be preserved entirely. Extract this woman completely, including her outfit, accessories, and distinctive appearance.

ARTISTIC INTENTION:
Generate a cohesive multi-pose portrait series where the same woman from IMAGE 2 appears naturally in each pose position defined by IMAGE 1''s layout. The final composition should appear as if this woman had a professional photo session in the exact studio setup shown in IMAGE 1.

PHOTOGRAPHIC EXECUTION:
- Studio lighting: Maintain the three-point lighting setup from IMAGE 1 (key light, fill light, rim light)
- Camera work: Match the lens perspective and focal length for each pose (50mm portrait lens equivalent)
- Color grading: Professional commercial photography color science with natural skin tones
- Background: Clean, professional studio backdrop with subtle gradient
- Focus: Sharp focus on subject with professional bokeh in background
- Resolution: High-resolution commercial photography quality (1920x1080 minimum)

CONSISTENCY ACROSS COMPOSITION:
The woman''s identity from IMAGE 2 remains absolutely consistent across all pose variations. Her facial features, skin tone, hair styling, and outfit appear identical in the headshot, full-body, and profile views, creating a unified portrait series.

CRITICAL COMPOSITION RULES:
Use IMAGE 2''s subject exclusively - do not blend or mix characteristics from IMAGE 1. Preserve IMAGE 1''s multi-pose layout structure entirely. Maintain photorealistic commercial photography standards throughout.',
    description = 'Prompt optimizado según documentación Google. Femenino realistic con lenguaje cinematográfico.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- ==========================================
-- ID 2: FEMALE + PIXAR (Google-optimized)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Create a Pixar-quality 3D animated character composition by transforming the woman from IMAGE 2 into a Pixar-style cartoon character and integrating her across the multi-pose layout from IMAGE 1.

SCENE DESCRIPTION:
IMAGE 1 displays a professional multi-pose character layout (portrait, full-body, side view) typical of Pixar character design sheets. This layout defines the compositional structure and camera angles for our final character presentation.

IMAGE 2 shows the woman who will be transformed into a Pixar 3D character. Her distinctive features and personality should translate into the cartoon character while maintaining recognizability.

ARTISTIC INTENTION:
Generate a Pixar animation-quality character study where the same 3D character (based on the woman from IMAGE 2) appears in multiple poses matching IMAGE 1''s layout. The result should feel like an official Pixar character design sheet for a feature film.

PIXAR ANIMATION AESTHETIC:
- Character design: Large expressive eyes with emotional sparkle (Disney/Pixar female character style), soft rounded facial features, appealing cartoon proportions
- Rendering: High-quality 3D subsurface scattering on skin, smooth gradient shading, professional Pixar render quality
- Lighting: Cinematic three-point lighting with soft ambient occlusion and gentle rim lighting
- Materials: Pixar-signature shaders with subtle translucency and vibrant yet natural colors
- Background: Clean professional presentation with subtle gradient matching Pixar character sheets

VISUAL CONSISTENCY:
The same Pixar character appears across all poses with identical facial features, coloring, styling, and outfit adapted to cartoon form. The character maintains recognizable traits from IMAGE 2''s woman while fully embodying Pixar''s animation style.

CRITICAL COMPOSITION RULES:
Transform IMAGE 2''s subject exclusively into Pixar style - no blending with IMAGE 1. Use IMAGE 1''s layout structure completely. Maintain pure Pixar animation studio quality.',
    description = 'Prompt optimizado según documentación Google. Femenino Pixar con lenguaje de animación cinematográfica.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 3: MALE + REALISTIC (Google-optimized)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Create a professional multi-pose photographic composition by extracting the person from IMAGE 2 and seamlessly integrating them into the studio layout shown in IMAGE 1.

SCENE DESCRIPTION:
IMAGE 1 presents a professional studio photography layout featuring multiple poses (headshot, full-body portrait, three-quarter view, side profile). This layout serves as the compositional template with its professional lighting setup, clean white background, and commercial photography aesthetic.

IMAGE 2 contains the primary subject whose identity, facial features, and personal characteristics must be preserved entirely. Extract this person completely, including their outfit, accessories, and distinctive appearance.

ARTISTIC INTENTION:
Generate a cohesive multi-pose portrait series where the same person from IMAGE 2 appears naturally in each pose position defined by IMAGE 1''s layout. The final composition should appear as if this person had a professional photo session in the exact studio setup shown in IMAGE 1.

PHOTOGRAPHIC EXECUTION:
- Studio lighting: Maintain the three-point lighting setup from IMAGE 1 (key light, fill light, rim light)
- Camera work: Match the lens perspective and focal length for each pose (50mm portrait lens equivalent)
- Color grading: Professional commercial photography color science with natural skin tones
- Background: Clean, professional studio backdrop with subtle gradient
- Focus: Sharp focus on subject with professional bokeh in background
- Resolution: High-resolution commercial photography quality (1920x1080 minimum)

CONSISTENCY ACROSS COMPOSITION:
The person''s identity from IMAGE 2 remains absolutely consistent across all pose variations. Their facial features, skin tone, hair styling, and outfit appear identical in the headshot, full-body, and profile views, creating a unified portrait series.

CRITICAL COMPOSITION RULES:
Use IMAGE 2''s subject exclusively - do not blend or mix characteristics from IMAGE 1. Preserve IMAGE 1''s multi-pose layout structure entirely. Maintain photorealistic commercial photography standards throughout.',
    description = 'Prompt optimizado según documentación Google. Masculino realistic con lenguaje cinematográfico.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- ==========================================
-- ID 4: MALE + PIXAR (Google-optimized)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Create a Pixar-quality 3D animated character composition by transforming the person from IMAGE 2 into a Pixar-style cartoon character and integrating them across the multi-pose layout from IMAGE 1.

SCENE DESCRIPTION:
IMAGE 1 displays a professional multi-pose character layout (portrait, full-body, side view) typical of Pixar character design sheets. This layout defines the compositional structure and camera angles for our final character presentation.

IMAGE 2 shows the person who will be transformed into a Pixar 3D character. Their distinctive features and personality should translate into the cartoon character while maintaining recognizability.

ARTISTIC INTENTION:
Generate a Pixar animation-quality character study where the same 3D character (based on the person from IMAGE 2) appears in multiple poses matching IMAGE 1''s layout. The result should feel like an official Pixar character design sheet for a feature film.

PIXAR ANIMATION AESTHETIC:
- Character design: Large expressive eyes with emotional depth, soft rounded facial features, appealing cartoon proportions
- Rendering: High-quality 3D subsurface scattering on skin, smooth gradient shading, professional Pixar render quality
- Lighting: Cinematic three-point lighting with soft ambient occlusion and gentle rim lighting
- Materials: Pixar-signature shaders with subtle translucency and vibrant yet natural colors
- Background: Clean professional presentation with subtle gradient matching Pixar character sheets

VISUAL CONSISTENCY:
The same Pixar character appears across all poses with identical facial features, coloring, styling, and outfit adapted to cartoon form. The character maintains recognizable traits from IMAGE 2''s person while fully embodying Pixar''s animation style.

CRITICAL COMPOSITION RULES:
Transform IMAGE 2''s subject exclusively into Pixar style - no blending with IMAGE 1. Use IMAGE 1''s layout structure completely. Maintain pure Pixar animation studio quality.',
    description = 'Prompt optimizado según documentación Google. Masculino Pixar con lenguaje de animación cinematográfica.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 4;

-- ==========================================
-- VERIFICACIÓN DE LONGITUDES
-- ==========================================
SELECT
    id,
    gender,
    character_style,
    LENGTH(imagePrompt) as prompt_length,
    CASE
        WHEN LENGTH(imagePrompt) <= 2048 THEN '✅ OK'
        ELSE '❌ TOO LONG'
    END as status,
    is_active,
    updated_at
FROM api_google.staff_format
ORDER BY gender, character_style;
