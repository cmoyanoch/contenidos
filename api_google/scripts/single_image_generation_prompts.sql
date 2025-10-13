-- ========================================
-- SINGLE IMAGE GENERATION: Sin layout de referencia
-- ========================================
-- Nueva estrategia: Usar SOLO la imagen de la persona (dos.jpeg)
-- Generar el layout completo desde cero sin imagen de referencia
-- El modelo tiene libertad completa para crear todas las poses
-- ========================================

-- ==========================================
-- ID 1: FEMALE + REALISTIC (Single image)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a complete professional photography portfolio showing this woman in 5 different studio poses, creating a multi-pose character sheet layout.

SUBJECT ANALYSIS:
Carefully analyze the woman in the provided image. Note her exact facial features, skin tone, hair color, hair length, hair style, eye color, facial structure, and any distinctive characteristics. She is wearing a professional navy blue blazer with a patterned scarf.

GENERATE 5 PROFESSIONAL STUDIO POSES:

1. CLOSE-UP HEADSHOT (upper left quadrant):
Professional headshot from shoulders up, slight smile, direct eye contact with camera, sharp focus on face.

2. FULL-BODY THREE-QUARTER VIEW (upper right quadrant):
Standing pose at 45-degree angle, hands adjusting blazer button naturally, full professional attire visible, confident posture.

3. FULL-BODY FRONT VIEW (lower left quadrant):
Standing straight facing camera, arms at sides naturally, complete view of professional outfit, confident stance.

4. CLOSE-UP PORTRAIT (lower right quadrant):
Head and shoulders shot, warm professional smile, slightly angled for dimension, engaging expression.

5. SIDE PROFILE VIEW (bottom center):
Profile view from the side, hair and facial features clearly visible, professional demeanor, natural positioning.

PROFESSIONAL PHOTOGRAPHY STANDARDS:
- Studio Setup: Clean white seamless backdrop with subtle gradient
- Lighting: Three-point lighting setup (key light, fill light, rim light) creating professional studio quality
- Camera: Shot with 50mm portrait lens at f/2.8 for professional depth of field and bokeh
- Color Grading: Commercial photography color science with accurate, natural skin tones
- Quality: High-resolution commercial photography (minimum 1920x1080)
- Consistency: Same woman, same outfit, same lighting quality across ALL 5 poses
- Composition: Professional multi-pose layout typical of corporate headshot sheets

CRITICAL CONSISTENCY REQUIREMENTS:
- The EXACT SAME WOMAN must appear in ALL 5 poses
- Identical facial features, skin tone, hair color, hair style in every shot
- Same navy blue blazer and patterned scarf in all poses
- Consistent professional studio lighting and background throughout
- Professional corporate photography aesthetic maintained across entire layout
- All 5 poses must be cohesive and appear as if shot in the same professional photo session',
    description = 'Prompt SINGLE IMAGE para realistic. Genera layout completo de 5 poses desde UNA sola imagen de entrada.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- ==========================================
-- ID 2: FEMALE + PIXAR (Single image)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a complete Pixar-style 3D character design sheet showing this woman as a Pixar animated character in 5 different poses.

SUBJECT ANALYSIS:
Carefully analyze the woman in the provided image. Transform her distinctive features into Pixar animation style while maintaining recognizability. Note her facial structure, hair color, hair length, eye color, and overall appearance to translate into cartoon form.

GENERATE 5 PIXAR CHARACTER POSES:

1. CLOSE-UP HEADSHOT (upper left quadrant):
Pixar-style cartoon headshot with large expressive eyes, warm smile, characteristic Disney/Pixar female character features.

2. FULL-BODY THREE-QUARTER VIEW (upper right quadrant):
Standing character at 45-degree angle, hands adjusting blazer naturally, appealing Pixar proportions, confident cartoon posture.

3. FULL-BODY FRONT VIEW (lower left quadrant):
Standing straight facing forward, arms naturally positioned, complete view of character in professional navy blue blazer outfit.

4. CLOSE-UP PORTRAIT (lower right quadrant):
Character portrait with emotional depth, friendly expression, characteristic Pixar warmth and appeal in facial features.

5. SIDE PROFILE VIEW (bottom center):
Profile view showing character from the side, hair and facial features clearly defined, maintaining Pixar character design consistency.

PIXAR ANIMATION STANDARDS:
- Character Design: Large expressive eyes with emotional sparkle and depth, soft rounded facial features, appealing feminine Pixar proportions
- Rendering: High-quality 3D rendering with subsurface scattering on skin, smooth gradient shading, professional Pixar studio quality
- Lighting: Cinematic three-point lighting with soft ambient occlusion and gentle rim lighting
- Materials: Pixar-signature shaders with subtle translucency, vibrant yet natural color palette with feminine warmth
- Background: Clean professional gradient background typical of Pixar character design sheets
- Style: Pure Pixar Animation Studios aesthetic throughout all poses
- Quality: High-resolution Pixar-quality 3D rendering (minimum 1920x1080)

CRITICAL CONSISTENCY REQUIREMENTS:
- The SAME Pixar character must appear in ALL 5 poses
- Identical cartoon facial features, hair color, hair style, and coloring in every pose
- Same navy blue blazer outfit adapted to Pixar cartoon style across all poses
- Consistent Pixar animation quality and lighting throughout entire layout
- Pure 3D Pixar animation style - absolutely NO photographic elements
- All 5 poses must appear as official Pixar character turnaround sheet for an animated film',
    description = 'Prompt SINGLE IMAGE para Pixar. Genera layout completo de 5 poses Pixar desde UNA sola imagen de entrada.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- ==========================================
-- ID 3: MALE + REALISTIC (Single image)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a complete professional photography portfolio showing this person in 5 different studio poses, creating a multi-pose character sheet layout.

SUBJECT ANALYSIS:
Carefully analyze the person in the provided image. Note their exact facial features, skin tone, hair color, hair length, hair style, eye color, facial structure, and any distinctive characteristics. They are wearing a professional navy blue blazer with a patterned scarf.

GENERATE 5 PROFESSIONAL STUDIO POSES:

1. CLOSE-UP HEADSHOT (upper left quadrant):
Professional headshot from shoulders up, slight smile, direct eye contact with camera, sharp focus on face.

2. FULL-BODY THREE-QUARTER VIEW (upper right quadrant):
Standing pose at 45-degree angle, hands adjusting blazer button naturally, full professional attire visible, confident posture.

3. FULL-BODY FRONT VIEW (lower left quadrant):
Standing straight facing camera, arms at sides naturally, complete view of professional outfit, confident stance.

4. CLOSE-UP PORTRAIT (lower right quadrant):
Head and shoulders shot, warm professional smile, slightly angled for dimension, engaging expression.

5. SIDE PROFILE VIEW (bottom center):
Profile view from the side, hair and facial features clearly visible, professional demeanor, natural positioning.

PROFESSIONAL PHOTOGRAPHY STANDARDS:
- Studio Setup: Clean white seamless backdrop with subtle gradient
- Lighting: Three-point lighting setup (key light, fill light, rim light) creating professional studio quality
- Camera: Shot with 50mm portrait lens at f/2.8 for professional depth of field and bokeh
- Color Grading: Commercial photography color science with accurate, natural skin tones
- Quality: High-resolution commercial photography (minimum 1920x1080)
- Consistency: Same person, same outfit, same lighting quality across ALL 5 poses
- Composition: Professional multi-pose layout typical of corporate headshot sheets

CRITICAL CONSISTENCY REQUIREMENTS:
- The EXACT SAME PERSON must appear in ALL 5 poses
- Identical facial features, skin tone, hair color, hair style in every shot
- Same navy blue blazer and patterned scarf in all poses
- Consistent professional studio lighting and background throughout
- Professional corporate photography aesthetic maintained across entire layout
- All 5 poses must be cohesive and appear as if shot in the same professional photo session',
    description = 'Prompt SINGLE IMAGE para realistic masculino. Genera layout completo de 5 poses desde UNA sola imagen de entrada.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- ==========================================
-- ID 4: MALE + PIXAR (Single image)
-- ==========================================
UPDATE api_google.staff_format
SET imagePrompt = 'Generate a complete Pixar-style 3D character design sheet showing this person as a Pixar animated character in 5 different poses.

SUBJECT ANALYSIS:
Carefully analyze the person in the provided image. Transform their distinctive features into Pixar animation style while maintaining recognizability. Note their facial structure, hair color, hair length, eye color, and overall appearance to translate into cartoon form.

GENERATE 5 PIXAR CHARACTER POSES:

1. CLOSE-UP HEADSHOT (upper left quadrant):
Pixar-style cartoon headshot with large expressive eyes, warm smile, characteristic Disney/Pixar character features.

2. FULL-BODY THREE-QUARTER VIEW (upper right quadrant):
Standing character at 45-degree angle, hands adjusting blazer naturally, appealing Pixar proportions, confident cartoon posture.

3. FULL-BODY FRONT VIEW (lower left quadrant):
Standing straight facing forward, arms naturally positioned, complete view of character in professional navy blue blazer outfit.

4. CLOSE-UP PORTRAIT (lower right quadrant):
Character portrait with emotional depth, friendly expression, characteristic Pixar warmth and appeal in facial features.

5. SIDE PROFILE VIEW (bottom center):
Profile view showing character from the side, hair and facial features clearly defined, maintaining Pixar character design consistency.

PIXAR ANIMATION STANDARDS:
- Character Design: Large expressive eyes with emotional depth, soft rounded facial features, appealing Pixar proportions
- Rendering: High-quality 3D rendering with subsurface scattering on skin, smooth gradient shading, professional Pixar studio quality
- Lighting: Cinematic three-point lighting with soft ambient occlusion and gentle rim lighting
- Materials: Pixar-signature shaders with subtle translucency, vibrant yet natural color palette
- Background: Clean professional gradient background typical of Pixar character design sheets
- Style: Pure Pixar Animation Studios aesthetic throughout all poses
- Quality: High-resolution Pixar-quality 3D rendering (minimum 1920x1080)

CRITICAL CONSISTENCY REQUIREMENTS:
- The SAME Pixar character must appear in ALL 5 poses
- Identical cartoon facial features, hair color, hair style, and coloring in every pose
- Same navy blue blazer outfit adapted to Pixar cartoon style across all poses
- Consistent Pixar animation quality and lighting throughout entire layout
- Pure 3D Pixar animation style - absolutely NO photographic elements
- All 5 poses must appear as official Pixar character turnaround sheet for an animated film',
    description = 'Prompt SINGLE IMAGE para Pixar masculino. Genera layout completo de 5 poses Pixar desde UNA sola imagen de entrada.',
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
    LEFT(description, 80) as desc
FROM api_google.staff_format
ORDER BY gender, character_style;
