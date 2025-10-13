-- ========================================
-- COMPACT PROMPTS: Optimizados bajo 2048 caracteres
-- ========================================
-- Prompts condensados y efectivos que cumplen límite de API
-- Mantienen funcionalidad completa con menos palabras
-- ========================================

-- ==========================================
-- ID 1: FEMALE + REALISTIC (1850 chars)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Extract the WOMAN from IMAGE 2 and replicate her in all poses of IMAGE 1''s multi-pose layout with professional photographic quality.

EXTRACTION (IMAGE 2):
- Identify primary woman in image 2
- Analyze facial features, skin tone, hair style/color
- Note outfit, accessories, professional appearance
- Preserve unique identity markers

REPLICATION (IMAGE 1):
- IMAGE 1 shows multi-pose layout (headshot, full body, side view, etc.)
- Place SAME woman from image 2 into EACH pose of image 1
- Keep exact camera angles, framing, composition from image 1
- Preserve background, lighting, studio aesthetic from image 1

CONSISTENCY:
- SAME woman appears in ALL poses
- Identical facial features, skin tone, hair across all poses
- Outfit from image 2 adapted naturally to each pose
- Seamless lighting and color matching throughout

ENHANCEMENT:
- Studio-quality lighting and color grading
- Sharp focus, natural skin tones, realistic textures
- Professional background consistency
- High-resolution output (1920x1080+)
- Subtle retouching maintaining natural feminine appearance

CRITICAL:
- Subject: WOMAN from IMAGE 2 only
- Layout: Multi-pose from IMAGE 1 only
- NO alterations to facial features, ethnicity, skin tone
- NO mixing characteristics from both images
- Photorealistic quality throughout',
    description = 'Prompt compacto FEMENINO REALISTIC. Extrae mujer de imagen 2, replica en layout imagen 1. <2048 chars.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- ==========================================
-- ID 2: FEMALE + PIXAR (1950 chars)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Extract WOMAN from IMAGE 2, transform to Pixar 3D cartoon, and replicate across all poses in IMAGE 1''s multi-pose layout.

EXTRACTION (IMAGE 2):
- Identify primary woman in image 2
- Analyze key facial features, expressions, feminine characteristics
- Note outfit, style, professional appearance
- Mark unique identity markers for cartoon transformation

PIXAR TRANSFORMATION:
- Transform woman to Pixar-quality 3D character
- Large expressive eyes with sparkle (feminine Disney/Pixar style)
- Smooth stylized features maintaining recognizability
- Soft rounded proportions (Pixar female design)
- Vibrant colors, appealing feminine cartoon aesthetic
- Preserve unique characteristics in cartoon form

REPLICATION (IMAGE 1):
- IMAGE 1 shows multi-pose layout (headshot, full body, side view, etc.)
- Place SAME Pixar character from image 2 into EACH pose of image 1
- Keep exact camera angles, framing, composition from image 1
- Adapt background/aesthetic from image 1 to Pixar style

CONSISTENCY:
- SAME Pixar female character in ALL poses
- Identical cartoon features, colors, style across poses
- Outfit adapted to Pixar style for each pose
- Consistent Pixar lighting/rendering throughout

ENHANCEMENT:
- High-quality 3D Pixar animation aesthetic
- Soft shadows, cinematic ambient lighting
- Sharp details, smooth textures
- High-resolution output (1920x1080+)
- Vibrant natural color palette with feminine warmth

CRITICAL:
- Subject: WOMAN from IMAGE 2 in Pixar style
- Layout: Multi-pose from IMAGE 1
- Maintain recognizable feminine characteristics
- Pure Pixar aesthetic throughout
- NO mixing characteristics from both images',
    description = 'Prompt compacto FEMENINO PIXAR. Extrae mujer de imagen 2, transforma a Pixar, replica en layout imagen 1. <2048 chars.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 3: MALE + REALISTIC (1800 chars)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Extract the PERSON from IMAGE 2 and replicate them in all poses of IMAGE 1''s multi-pose layout with professional photographic quality.

EXTRACTION (IMAGE 2):
- Identify primary person in image 2
- Analyze facial features, skin tone, hair style/color
- Note outfit, accessories, professional appearance
- Preserve unique identity markers

REPLICATION (IMAGE 1):
- IMAGE 1 shows multi-pose layout (headshot, full body, side view, etc.)
- Place SAME person from image 2 into EACH pose of image 1
- Keep exact camera angles, framing, composition from image 1
- Preserve background, lighting, studio aesthetic from image 1

CONSISTENCY:
- SAME person appears in ALL poses
- Identical facial features, skin tone, hair across all poses
- Outfit from image 2 adapted naturally to each pose
- Seamless lighting and color matching throughout

ENHANCEMENT:
- Studio-quality lighting and color grading
- Sharp focus, natural skin tones, realistic textures
- Professional background consistency
- High-resolution output (1920x1080+)
- Subtle retouching maintaining natural appearance

CRITICAL:
- Subject: PERSON from IMAGE 2 only
- Layout: Multi-pose from IMAGE 1 only
- NO alterations to facial features, ethnicity, skin tone
- NO mixing characteristics from both images
- Photorealistic quality throughout',
    description = 'Prompt compacto MASCULINO REALISTIC. Extrae persona de imagen 2, replica en layout imagen 1. <2048 chars.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- ==========================================
-- ID 4: MALE + PIXAR (1900 chars)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Extract PERSON from IMAGE 2, transform to Pixar 3D cartoon, and replicate across all poses in IMAGE 1''s multi-pose layout.

EXTRACTION (IMAGE 2):
- Identify primary person in image 2
- Analyze key facial features, expressions, characteristics
- Note outfit, style, professional appearance
- Mark unique identity markers for cartoon transformation

PIXAR TRANSFORMATION:
- Transform person to Pixar-quality 3D character
- Large expressive eyes with emotional depth
- Smooth stylized features maintaining recognizability
- Soft rounded proportions (Pixar character design)
- Vibrant colors, appealing cartoon aesthetic
- Preserve unique characteristics in cartoon form

REPLICATION (IMAGE 1):
- IMAGE 1 shows multi-pose layout (headshot, full body, side view, etc.)
- Place SAME Pixar character from image 2 into EACH pose of image 1
- Keep exact camera angles, framing, composition from image 1
- Adapt background/aesthetic from image 1 to Pixar style

CONSISTENCY:
- SAME Pixar character in ALL poses
- Identical cartoon features, colors, style across poses
- Outfit adapted to Pixar style for each pose
- Consistent Pixar lighting/rendering throughout

ENHANCEMENT:
- High-quality 3D Pixar animation aesthetic
- Soft shadows, cinematic ambient lighting
- Sharp details, smooth textures
- High-resolution output (1920x1080+)
- Vibrant natural color palette

CRITICAL:
- Subject: PERSON from IMAGE 2 in Pixar style
- Layout: Multi-pose from IMAGE 1
- Maintain recognizable characteristics
- Pure Pixar aesthetic throughout
- NO mixing characteristics from both images',
    description = 'Prompt compacto MASCULINO PIXAR. Extrae persona de imagen 2, transforma a Pixar, replica en layout imagen 1. <2048 chars.',
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
