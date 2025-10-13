-- ========================================
-- FIX: Prompts optimizados para reemplazo de personaje en layout multi-pose
-- ========================================
-- Problema: Los prompts anteriores tomaban personaje de imagen 1 y layout de imagen 2
-- Solución: Nuevos prompts toman personaje de imagen 2 y lo replican en layout de imagen 1
--
-- Uso correcto:
--   imageDataUrl  (imagen 1) = formato.png (layout con múltiples poses)
--   imageDataUrl2 (imagen 2) = dos.jpeg (persona objetivo a replicar)
-- ========================================

-- Actualizar template REALISTIC (ID 3)
UPDATE api_google.staff_format
SET imagePrompt = 'TASK: Extract the person from IMAGE 2 and replicate them across all poses shown in IMAGE 1''s multi-pose layout, maintaining professional photographic quality.

STEP 1 - CHARACTER EXTRACTION & ANALYSIS (FROM IMAGE 2):
- Identify and extract the PRIMARY PERSON from image 2
- Analyze their exact facial features, skin tone, hair style, and hair color
- Note their outfit, accessories, and professional appearance
- Preserve their unique identity markers and characteristics

STEP 2 - MULTI-POSE LAYOUT REPLICATION (INTO IMAGE 1):
- IMAGE 1 shows a multi-pose professional layout (headshot, full body, side view, etc.)
- Replicate the SAME PERSON from image 2 into EACH pose position of image 1
- Maintain the exact camera angles, framing, and composition of each pose in image 1
- Preserve the background, lighting setup, and professional studio aesthetic from image 1

STEP 3 - CONSISTENCY ACROSS ALL POSES:
- The SAME person (from image 2) must appear in ALL poses
- Keep identical facial features, skin tone, and hair across all poses
- Adapt the outfit from image 2 to match each pose naturally
- Ensure seamless lighting and color matching across the entire layout

STEP 4 - PROFESSIONAL PHOTOGRAPHIC ENHANCEMENT:
- Studio-quality lighting with professional color grading
- Sharp focus on the subject in each pose
- Natural skin tones and realistic textures
- Professional background consistency
- High-resolution output (1920x1080 or higher)
- Subtle professional retouching maintaining natural appearance

CRITICAL CONSTRAINTS:
- PRIMARY SUBJECT: The person from IMAGE 2 (NOT image 1)
- LAYOUT STRUCTURE: The multi-pose composition from IMAGE 1 (NOT image 2)
- IDENTITY PRESERVATION: Do NOT alter facial features, ethnicity, or skin tone of the person from image 2
- CONSISTENCY: The SAME person must appear in ALL poses within the layout
- REALISM: Maintain photorealistic quality throughout all poses
- NO MIXING: Do not blend or merge characteristics from both images - use image 2''s person entirely',
    description = 'Template CORREGIDO para reemplazo fotográfico realista. Toma persona de IMAGEN 2 y la replica en layout multi-pose de IMAGEN 1 con alta coherencia (temperature=0.45).',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- Actualizar template PIXAR (ID 4)
UPDATE api_google.staff_format
SET imagePrompt = 'TASK: Extract the person from IMAGE 2 and replicate them as a Pixar-style 3D cartoon character across all poses shown in IMAGE 1''s multi-pose layout.

STEP 1 - CHARACTER EXTRACTION & ANALYSIS (FROM IMAGE 2):
- Identify and extract the PRIMARY PERSON from image 2
- Analyze their key facial features, expressions, and distinctive characteristics
- Note their outfit, style, and professional appearance
- Identify unique identity markers to preserve during cartoon transformation

STEP 2 - PIXAR STYLE TRANSFORMATION:
- Transform the person from image 2 into a Pixar-quality 3D cartoon character
- Large expressive eyes with emotional depth and sparkle
- Smooth stylized facial features maintaining recognizability
- Soft rounded proportions typical of Pixar character design
- Vibrant colors and appealing cartoon aesthetics
- Maintain the person''s unique characteristics in cartoon form

STEP 3 - MULTI-POSE LAYOUT REPLICATION (INTO IMAGE 1):
- IMAGE 1 shows a multi-pose professional layout (headshot, full body, side view, etc.)
- Replicate the SAME Pixar character (from image 2) into EACH pose position of image 1
- Maintain the exact camera angles, framing, and composition of each pose in image 1
- Preserve the background style and professional aesthetic from image 1 in Pixar style

STEP 4 - CONSISTENCY ACROSS ALL POSES:
- The SAME Pixar character must appear in ALL poses
- Keep identical cartoon facial features, colors, and style across all poses
- Adapt the outfit from image 2 to Pixar style and match each pose naturally
- Ensure consistent Pixar lighting and rendering quality across the entire layout

STEP 5 - PIXAR PROFESSIONAL ENHANCEMENT:
- High-quality 3D rendering with Pixar animation studio aesthetic
- Soft shadows and cinematic ambient lighting
- Professional Pixar-style background integration
- Sharp details and smooth textures
- High-resolution output (1920x1080 or higher)
- Vibrant but natural color palette

CRITICAL CONSTRAINTS:
- PRIMARY SUBJECT: The person from IMAGE 2 (NOT image 1) transformed to Pixar style
- LAYOUT STRUCTURE: The multi-pose composition from IMAGE 1 (NOT image 2)
- IDENTITY PRESERVATION: Maintain recognizable characteristics of the person from image 2
- STYLE CONSISTENCY: Pure Pixar animation aesthetic throughout all poses
- CHARACTER CONSISTENCY: The SAME Pixar character must appear in ALL poses within the layout
- NO MIXING: Do not blend characteristics from both images - use image 2''s person entirely in Pixar form',
    description = 'Template CORREGIDO para transformación Pixar 3D. Toma persona de IMAGEN 2, la transforma a estilo Pixar y la replica en layout multi-pose de IMAGEN 1 (temperature=0.55).',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 4;

-- Verificar los cambios
SELECT
    id,
    character_style,
    LEFT(imagePrompt, 150) as prompt_preview,
    temperature,
    description,
    updated_at
FROM api_google.staff_format
WHERE id IN (3, 4)
ORDER BY id;
