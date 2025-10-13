-- ========================================
-- UPDATE: Prompts corregidos para género FEMENINO
-- ========================================
-- Actualiza IDs 1 y 2 con prompts correctos que:
--   - Extraen persona de IMAGEN 2 (persona objetivo)
--   - Replican en layout multi-pose de IMAGEN 1
-- ========================================

-- ==========================================
-- ID 1: FEMALE + REALISTIC
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'TASK: Extract the WOMAN from IMAGE 2 and replicate her across all poses shown in IMAGE 1''s multi-pose layout, maintaining professional photographic quality.

STEP 1 - CHARACTER EXTRACTION & ANALYSIS (FROM IMAGE 2):
- Identify and extract the PRIMARY WOMAN from image 2
- Analyze her exact facial features, skin tone, hair style, and hair color
- Note her outfit, accessories, and professional appearance
- Preserve her unique feminine identity markers and characteristics

STEP 2 - MULTI-POSE LAYOUT REPLICATION (INTO IMAGE 1):
- IMAGE 1 shows a multi-pose professional layout (headshot, full body, side view, etc.)
- Replicate the SAME WOMAN from image 2 into EACH pose position of image 1
- Maintain the exact camera angles, framing, and composition of each pose in image 1
- Preserve the background, lighting setup, and professional studio aesthetic from image 1

STEP 3 - CONSISTENCY ACROSS ALL POSES:
- The SAME woman (from image 2) must appear in ALL poses
- Keep identical facial features, skin tone, and hair across all poses
- Adapt the outfit from image 2 to match each pose naturally
- Ensure seamless lighting and color matching across the entire layout

STEP 4 - PROFESSIONAL PHOTOGRAPHIC ENHANCEMENT:
- Studio-quality lighting with professional color grading
- Sharp focus on the subject in each pose
- Natural skin tones and realistic textures
- Professional background consistency
- High-resolution output (1920x1080 or higher)
- Subtle professional retouching maintaining natural feminine appearance

CRITICAL CONSTRAINTS:
- PRIMARY SUBJECT: The WOMAN from IMAGE 2 (NOT image 1)
- LAYOUT STRUCTURE: The multi-pose composition from IMAGE 1 (NOT image 2)
- IDENTITY PRESERVATION: Do NOT alter facial features, ethnicity, or skin tone of the woman from image 2
- CONSISTENCY: The SAME woman must appear in ALL poses within the layout
- REALISM: Maintain photorealistic quality throughout all poses
- NO MIXING: Do not blend or merge characteristics from both images - use image 2''s woman entirely',
    description = 'Template CORREGIDO para reemplazo fotográfico realista FEMENINO. Toma mujer de IMAGEN 2 y la replica en layout multi-pose de IMAGEN 1 con alta coherencia (temperature=0.45).',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- ==========================================
-- ID 2: FEMALE + PIXAR
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'TASK: Extract the WOMAN from IMAGE 2 and replicate her as a Pixar-style 3D cartoon character across all poses shown in IMAGE 1''s multi-pose layout.

STEP 1 - CHARACTER EXTRACTION & ANALYSIS (FROM IMAGE 2):
- Identify and extract the PRIMARY WOMAN from image 2
- Analyze her key facial features, expressions, and distinctive feminine characteristics
- Note her outfit, style, and professional appearance
- Identify unique identity markers to preserve during cartoon transformation

STEP 2 - PIXAR STYLE TRANSFORMATION:
- Transform the woman from image 2 into a Pixar-quality 3D cartoon character
- Large expressive eyes with emotional depth and sparkle (feminine Disney/Pixar style)
- Smooth stylized facial features maintaining recognizability
- Soft rounded proportions typical of Pixar female character design
- Vibrant colors and appealing feminine cartoon aesthetics
- Maintain the woman''s unique characteristics in cartoon form

STEP 3 - MULTI-POSE LAYOUT REPLICATION (INTO IMAGE 1):
- IMAGE 1 shows a multi-pose professional layout (headshot, full body, side view, etc.)
- Replicate the SAME Pixar female character (from image 2) into EACH pose position of image 1
- Maintain the exact camera angles, framing, and composition of each pose in image 1
- Preserve the background style and professional aesthetic from image 1 in Pixar style

STEP 4 - CONSISTENCY ACROSS ALL POSES:
- The SAME Pixar female character must appear in ALL poses
- Keep identical cartoon facial features, colors, and style across all poses
- Adapt the outfit from image 2 to Pixar style and match each pose naturally
- Ensure consistent Pixar lighting and rendering quality across the entire layout

STEP 5 - PIXAR PROFESSIONAL ENHANCEMENT:
- High-quality 3D rendering with Pixar animation studio aesthetic
- Soft shadows and cinematic ambient lighting
- Professional Pixar-style background integration
- Sharp details and smooth textures (feminine Pixar character quality)
- High-resolution output (1920x1080 or higher)
- Vibrant but natural color palette with feminine warmth

CRITICAL CONSTRAINTS:
- PRIMARY SUBJECT: The WOMAN from IMAGE 2 (NOT image 1) transformed to Pixar style
- LAYOUT STRUCTURE: The multi-pose composition from IMAGE 1 (NOT image 2)
- IDENTITY PRESERVATION: Maintain recognizable feminine characteristics of the woman from image 2
- STYLE CONSISTENCY: Pure Pixar animation aesthetic throughout all poses
- CHARACTER CONSISTENCY: The SAME Pixar female character must appear in ALL poses within the layout
- NO MIXING: Do not blend characteristics from both images - use image 2''s woman entirely in Pixar form',
    description = 'Template CORREGIDO para transformación Pixar 3D FEMENINA. Toma mujer de IMAGEN 2, la transforma a estilo Pixar y la replica en layout multi-pose de IMAGEN 1 (temperature=0.55).',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
SELECT
    id,
    gender,
    character_style,
    directory,
    is_active,
    temperature,
    LEFT(imagePrompt, 80) as prompt_preview,
    updated_at
FROM api_google.staff_format
ORDER BY gender, character_style;
