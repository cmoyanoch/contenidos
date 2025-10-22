"""
Esquemas Pydantic para la API
"""
from pydantic import BaseModel, Field, validator, root_validator, model_validator
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime

class VideoGenerationRequest(BaseModel):
    """Request para generación de video desde texto"""
    prompt: str = Field(..., description="Descripción del video a generar")
    aspect_ratio: Literal["16:9", "9:16"] = Field(default="16:9", description="Relación de aspecto del video (16:9 o 9:16)")
    resolution: str = Field(default="720p", description="Resolución del video (720p o 1080p)")
    veo_model: Literal["veo-3.0-generate-preview", "veo-3.0-fast-generate-001"] = Field(
        default="veo-3.0-generate-preview",
        description="Modelo Veo a utilizar: preview (calidad alta) o fast (velocidad alta)"
    )
    negative_prompt: Optional[str] = Field(None, description="Elementos a evitar en el video", max_length=500)

class ImageToVideoRequest(BaseModel):
    """Request para generación de video desde imagen"""
    prompt: str = Field(..., description="Descripción del video a generar")
    image_url: str = Field(..., description="URL de la imagen base")
    aspect_ratio: Literal["16:9", "9:16"] = Field(default="16:9", description="Relación de aspecto del video (16:9 o 9:16)")
    resolution: str = Field(default="720p", description="Resolución del video (720p o 1080p)")
    veo_model: Literal["veo-3.0-generate-preview", "veo-3.0-fast-generate-001"] = Field(
        default="veo-3.0-generate-preview",
        description="Modelo Veo a utilizar: preview (calidad alta) o fast (velocidad alta)"
    )
    negative_prompt: Optional[str] = Field(None, description="Elementos a evitar en el video", max_length=500)

class ImageToVideoBase64Request(BaseModel):
    """Request para generación de video desde imagen base64"""
    prompt: str = Field(..., description="Descripción del video a generar")
    image_base64: str = Field(..., description="Imagen en formato base64 (con o sin prefijos data: o base64,)")
    content_type: Optional[str] = Field(default="image/jpeg", description="Tipo MIME de la imagen (se detecta automáticamente si no se proporciona)")
    aspect_ratio: Literal["16:9", "9:16"] = Field(default="16:9", description="Relación de aspecto del video (16:9 o 9:16)")
    resolution: str = Field(default="720p", description="Resolución del video (720p o 1080p)")
    veo_model: Literal["veo-3.0-generate-preview", "veo-3.0-fast-generate-001"] = Field(
        default="veo-3.0-generate-preview",
        description="Modelo Veo a utilizar: preview (calidad alta) o fast (velocidad alta)"
    )
    negative_prompt: Optional[str] = Field(None, description="Elementos a evitar en el video", max_length=500)
    scene_index: Optional[int] = Field(default=0, description="Índice de la escena para distinguir en workflows multi-escena")

class VideoGenerationResponse(BaseModel):
    """Response para generación de video"""
    operation_id: str = Field(..., description="ID de la operación")
    status: str = Field(..., description="Estado de la operación")
    message: str = Field(..., description="Mensaje descriptivo")
    scene_index: Optional[int] = Field(default=None, description="Índice de la escena procesada (si aplica)")

class VideoStatusResponse(BaseModel):
    """Response para estado de operación de video"""
    operation_id: str = Field(..., description="ID de la operación")
    status: str = Field(..., description="Estado de la operación")
    prompt: str = Field(..., description="Prompt utilizado")
    type: str = Field(..., description="Tipo de operación")
    created_at: float = Field(..., description="Timestamp de creación")
    completed_at: Optional[float] = Field(None, description="Timestamp de finalización")
    video_url: Optional[str] = Field(None, description="URL del video generado")
    filename: Optional[str] = Field(None, description="Nombre del archivo")
    error_message: Optional[str] = Field(None, description="Mensaje de error si aplica")

class ImageGenerationRequest(BaseModel):
    """Request para generación de imagen con Gemini (soporta hasta 2 imágenes o generación desde cero)"""
    imagePrompt: str = Field(..., description="Prompt para generar/combinar la(s) imagen(es)", max_length=15000)

    # Primera imagen (OPCIONAL - permite generación desde cero) - SOPORTA MULTI-FORMATO
    imageDataUrl: Optional[str] = Field(
        None,
        description="Primera imagen (opcional). Soporta: 1) Base64 puro, 2) Data URL (data:image/...;base64,...), 3) Ruta local (/uploads/...), 4) URL remota (http://...). Si es None o vacío, genera imagen desde cero usando solo imagePrompt"
    )
    mimeType: Optional[str] = Field(None, description="Tipo MIME de la primera imagen (ej: image/jpeg, image/png). Auto-detectado si no se proporciona para rutas locales/URLs")

    # Segunda imagen (opcional) - SOPORTA MULTI-FORMATO
    imageDataUrl2: Optional[str] = Field(
        None,
        description="Segunda imagen (opcional). Soporta: 1) Base64 puro, 2) Data URL (data:image/...;base64,...), 3) Ruta local (/uploads/...), 4) URL remota (http://...)"
    )
    mimeType2: Optional[str] = Field(None, description="Tipo MIME de la segunda imagen (auto-detectado si no se proporciona)")

    # Estilo de personaje (opcional)
    character_style: Optional[str] = Field(
        default="realistic",
        description="Estilo del personaje: 'realistic' (foto real) o 'pixar' (estilo Pixar cartoon)"
    )

    # Configuración de imagen
    aspect_ratio: Optional[Literal["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]] = Field(
        default=None,
        description="Relación de aspecto de la imagen generada (ej: 16:9 para YouTube, 9:16 para Stories, 1:1 para Instagram Feed)"
    )

    temperature: Optional[float] = Field(default=0.7, description="Temperatura para generación", ge=0.0, le=2.0)
    maxOutputTokens: Optional[int] = Field(default=2048, description="Máximo número de tokens de salida", ge=1, le=8192)

class ImageGenerationResponse(BaseModel):
    """Response para generación de imagen - Estructura compatible con Gemini API"""
    candidates: Optional[list] = Field(None, description="Candidatos de respuesta de Gemini")
    usageMetadata: Optional[dict] = Field(None, description="Metadatos de uso de tokens")
    # Campos adicionales para compatibilidad
    status: Optional[str] = Field(default="success", description="Estado de la operación")
    generated_image_url: Optional[str] = Field(None, description="URL de la imagen generada")
    analysis: Optional[str] = Field(None, description="Descripción/análisis de la imagen generada")
    usage: Optional[dict] = Field(None, description="Información de uso de tokens (alias de usageMetadata)")

# === BATCH IMAGE ANALYSIS SCHEMAS ===

class BatchImageAnalysisItem(BaseModel):
    """Item individual para análisis batch de imágenes"""
    image_base64: str = Field(..., description="Imagen en formato base64")
    prompt: str = Field(..., description="Prompt para análisis de la imagen")
    content_type: Optional[str] = Field(default="image/jpeg", description="Tipo MIME de la imagen")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadatos adicionales")

class BatchImageAnalysisRequest(BaseModel):
    """Request para análisis batch de imágenes usando Gemini API"""
    items: List[BatchImageAnalysisItem] = Field(..., description="Lista de imágenes para analizar", min_items=1, max_items=10)
    temperature: Optional[float] = Field(default=0.7, description="Temperatura para generación", ge=0.0, le=2.0)
    max_output_tokens: Optional[int] = Field(default=2048, description="Máximo tokens de salida", ge=1, le=8192)
    batch_name: Optional[str] = Field(None, description="Nombre descriptivo del batch")

class BatchImageAnalysisItemResult(BaseModel):
    """Resultado individual de análisis de imagen"""
    index: int = Field(..., description="Índice del item en el batch")
    success: bool = Field(..., description="Si el análisis fue exitoso")
    analysis: Optional[str] = Field(None, description="Resultado del análisis")
    error: Optional[str] = Field(None, description="Mensaje de error si falló")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadatos del resultado")
    tokens_used: Optional[int] = Field(None, description="Tokens utilizados")

class BatchImageAnalysisResponse(BaseModel):
    """Respuesta de análisis batch de imágenes"""
    batch_id: str = Field(..., description="ID único del batch")
    batch_name: Optional[str] = Field(None, description="Nombre del batch")
    total_items: int = Field(..., description="Total de items procesados")
    successful_items: int = Field(..., description="Items procesados exitosamente")
    failed_items: int = Field(..., description="Items que fallaron")
    results: List[BatchImageAnalysisItemResult] = Field(..., description="Resultados individuales")
    processing_time_seconds: float = Field(..., description="Tiempo total de procesamiento")
    total_tokens_used: int = Field(..., description="Total de tokens utilizados")
    started_at: datetime = Field(..., description="Timestamp de inicio")
    completed_at: datetime = Field(..., description="Timestamp de finalización")

# === ROBUST ANALYSIS API SCHEMAS ===

class MediaAnalysisRequest(BaseModel):
    """Request base para análisis de medios"""
    media_type: Literal["image", "video"] = Field(..., description="Tipo de medio a analizar")
    analysis_prompt: Optional[str] = Field(
        default="Analiza este contenido de manera detallada describiendo: composición, elementos visuales, estilo, colores, iluminación, movimiento (si aplica), y características técnicas",
        description="Prompt específico para el análisis"
    )
    detailed_analysis: bool = Field(default=True, description="Si realizar análisis detallado o básico")
    extract_metadata: bool = Field(default=True, description="Si extraer metadatos técnicos")

class ImageAnalysisRequest(MediaAnalysisRequest):
    """Request para análisis de imagen"""
    image_base64: str = Field(..., description="Imagen en formato base64")
    content_type: str = Field(default="image/jpeg", description="Tipo MIME de la imagen")
    media_type: Literal["image"] = Field(default="image", description="Tipo fijo: imagen")
    analyze_composition: bool = Field(default=True, description="Analizar composición y reglas fotográficas")
    analyze_style: bool = Field(default=True, description="Analizar estilo artístico y técnico")
    analyze_colors: bool = Field(default=True, description="Analizar paleta de colores y armonías")

class VideoAnalysisRequest(MediaAnalysisRequest):
    """Request para análisis de video"""
    video_base64: Optional[str] = Field(None, description="Video en formato base64 (para videos pequeños)")
    video_url: Optional[str] = Field(None, description="URL del video a analizar")
    content_type: str = Field(default="video/mp4", description="Tipo MIME del video")
    media_type: Literal["video"] = Field(default="video", description="Tipo fijo: video")
    frame_analysis: bool = Field(default=True, description="Analizar frames individuales")
    extract_keyframes: bool = Field(default=True, description="Extraer keyframes representativos")
    analyze_motion: bool = Field(default=True, description="Analizar patrones de movimiento")
    analyze_audio: bool = Field(default=False, description="Analizar componente de audio (si está disponible)")

    @model_validator(mode='after')
    def validate_video_source(self):
        """Validar que se proporcione al menos video_base64 o video_url"""
        if not self.video_base64 and not self.video_url:
            raise ValueError('Se debe proporcionar video_base64 o video_url')
        return self


class FrameAnalysis(BaseModel):
    """Análisis de un frame individual"""
    frame_number: int = Field(..., description="Número del frame")
    timestamp: float = Field(..., description="Timestamp en segundos")
    description: str = Field(..., description="Descripción del contenido del frame")
    visual_elements: List[str] = Field(default_factory=list, description="Elementos visuales identificados")
    composition_notes: Optional[str] = Field(None, description="Notas sobre composición")
    dominant_colors: List[str] = Field(default_factory=list, description="Colores dominantes")

class TechnicalMetadata(BaseModel):
    """Metadatos técnicos del medio"""
    resolution: Optional[str] = Field(None, description="Resolución (ej: 1920x1080)")
    aspect_ratio: Optional[str] = Field(None, description="Relación de aspecto")
    duration: Optional[float] = Field(None, description="Duración en segundos (solo video)")
    fps: Optional[float] = Field(None, description="Frames por segundo (solo video)")
    frame_count: Optional[int] = Field(None, description="Número total de frames (solo video)")
    file_size_bytes: Optional[int] = Field(None, description="Tamaño del archivo en bytes")
    format: Optional[str] = Field(None, description="Formato del archivo")
    color_space: Optional[str] = Field(None, description="Espacio de color")

class MediaAnalysisResponse(BaseModel):
    """Respuesta base para análisis de medios"""
    analysis_id: str = Field(..., description="ID único del análisis")
    media_type: str = Field(..., description="Tipo de medio analizado")
    overall_description: str = Field(..., description="Descripción general del contenido")
    visual_style: str = Field(..., description="Descripción del estilo visual")
    technical_quality: str = Field(..., description="Evaluación de calidad técnica")
    content_themes: List[str] = Field(default_factory=list, description="Temas y conceptos identificados")
    mood_and_tone: str = Field(..., description="Estado de ánimo y tono del contenido")
    technical_metadata: Optional[TechnicalMetadata] = Field(None, description="Metadatos técnicos")
    processing_time_seconds: float = Field(..., description="Tiempo de procesamiento")
    created_at: datetime = Field(..., description="Timestamp de creación")

class ImageAnalysisResponse(MediaAnalysisResponse):
    """Respuesta específica para análisis de imagen"""
    composition_analysis: str = Field(..., description="Análisis de composición fotográfica")
    color_palette: List[str] = Field(default_factory=list, description="Paleta de colores principales")
    lighting_analysis: str = Field(..., description="Análisis de iluminación")
    subject_identification: List[str] = Field(default_factory=list, description="Sujetos principales identificados")
    artistic_style: str = Field(..., description="Estilo artístico identificado")
    replication_prompt: str = Field(..., description="Prompt optimizado para replicar la imagen")

class VideoAnalysisResponse(MediaAnalysisResponse):
    """Respuesta específica para análisis de video"""
    frame_count: int = Field(..., description="Número total de frames analizados")
    keyframes_analysis: List[FrameAnalysis] = Field(default_factory=list, description="Análisis de keyframes")
    motion_analysis: str = Field(..., description="Análisis de patrones de movimiento")
    scene_transitions: List[str] = Field(default_factory=list, description="Transiciones de escena identificadas")
    continuity_description: str = Field(..., description="Descripción para generar continuidad")
    last_frame_description: str = Field(..., description="Descripción detallada del último frame")
    extension_prompt: str = Field(..., description="Prompt para extender el video desde el último frame")
    estimated_duration: float = Field(..., description="Duración estimada del video")

class ContinuityGenerationRequest(BaseModel):
    """Request para generar continuidad de video con análisis completo"""
    original_video_analysis_id: str = Field(..., description="ID del análisis del video original")
    extension_duration: float = Field(default=8.0, description="Duración deseada de la extensión en segundos")
    continuity_style: Literal["smooth", "dramatic", "creative"] = Field(
        default="smooth",
        description="Estilo de continuidad: smooth (suave), dramatic (dramático), creative (creativo)"
    )
    custom_direction: Optional[str] = Field(None, description="Dirección personalizada para la continuidad")
    maintain_subjects: bool = Field(default=True, description="Mantener los mismos sujetos del video original")

    # Nuevos campos para análisis completo
    frame_analysis_id: Optional[str] = Field(None, description="ID del análisis del último frame (opcional)")
    use_enhanced_analysis: bool = Field(default=True, description="Usar análisis mejorado con metadatos completos")
    preserve_technical_metadata: bool = Field(default=True, description="Preservar metadatos técnicos del video original")
    preserve_visual_style: bool = Field(default=True, description="Preservar estilo visual del video original")
    preserve_content_themes: bool = Field(default=True, description="Preservar temas de contenido del video original")
    preserve_mood_and_tone: bool = Field(default=True, description="Preservar estado de ánimo y tono del video original")

class ContinuityGenerationResponse(BaseModel):
    """Respuesta para generación de continuidad con análisis completo"""
    generation_id: str = Field(..., description="ID de la generación de continuidad")
    original_analysis_id: str = Field(..., description="ID del análisis original")
    extension_prompt: str = Field(..., description="Prompt generado para la extensión")
    video_generation_operation_id: Optional[str] = Field(None, description="ID de operación de generación de video")
    status: str = Field(..., description="Estado de la generación")
    created_at: datetime = Field(..., description="Timestamp de creación")

    # Nuevos campos para análisis completo
    analysis_used: Dict = Field(default_factory=dict, description="Análisis utilizado para generar el prompt")
    prompt_enhancements: Dict = Field(default_factory=dict, description="Mejoras aplicadas al prompt")
    confidence_level: Literal["high", "medium", "low"] = Field(default="medium", description="Nivel de confianza del análisis")
    preserved_elements: List[str] = Field(default_factory=list, description="Elementos preservados del video original")
    technical_metadata_preserved: Optional[Dict] = Field(None, description="Metadatos técnicos preservados")
    visual_style_preserved: Optional[str] = Field(None, description="Estilo visual preservado")
    content_themes_preserved: Optional[List[str]] = Field(None, description="Temas de contenido preservados")
    mood_and_tone_preserved: Optional[str] = Field(None, description="Estado de ánimo y tono preservados")
