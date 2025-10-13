"""
Servicio para capturar y almacenar formatos de video para replicación.
"""
import asyncio
import base64
import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from services.robust_analysis_service import RobustAnalysisService
from models.schemas import VideoAnalysisRequest

logger = logging.getLogger(__name__)


class FormatCaptureService:
    """Servicio para capturar formatos de video y almacenarlos para replicación."""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.analysis_service = RobustAnalysisService()
        self.upload_dir = Path("/app/uploads/formats")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def capture_video_format(
        self,
        format_name: str,
        video_data: str,  # Base64 o URL
        description: Optional[str] = None,
        category: Optional[str] = "general",
        tags: Optional[List[str]] = None,
        use_case: Optional[str] = None,
        is_template: bool = False,
    ) -> Dict[str, Any]:
        """
        Captura un formato de video analizándolo y guardando toda la información
        necesaria para replicarlo.

        Args:
            format_name: Nombre único del formato
            video_data: Video en base64 o URL
            description: Descripción del formato
            category: Categoría (promotional, educational, entertainment, etc.)
            tags: Lista de tags para búsqueda
            use_case: Caso de uso específico
            is_template: Si es una plantilla predefinida

        Returns:
            Dict con información del formato capturado
        """
        try:
            logger.info(f"Iniciando captura de formato: {format_name}")

            # 1. Analizar el video
            analysis_request = VideoAnalysisRequest(
                video_base64=video_data if video_data.startswith("data:") else None,
                video_url=video_data if video_data.startswith("http") else None,
                detailed_analysis=True,
                extract_metadata=True,
                frame_analysis=True,
                extract_keyframes=True,
                analyze_motion=True,
                analyze_audio=True,
            )

            analysis_response = await self.analysis_service.analyze_video(analysis_request)

            # 2. Guardar el video de referencia (opcional)
            reference_path = None
            if video_data.startswith("data:"):
                reference_path = await self._save_reference_video(format_name, video_data)

            # 3. Generar prompt de replicación optimizado
            replication_prompt = self._generate_replication_prompt(analysis_response)
            negative_prompt = self._generate_negative_prompt(analysis_response)

            # 4. Extraer metadatos técnicos
            technical_metadata = analysis_response.technical_metadata or {}

            # 5. Determinar modelo recomendado
            recommended_model = self._determine_recommended_model(analysis_response, category)

            # 6. Preparar tags
            if tags is None:
                tags = []
            tags = list(set(tags + self._extract_automatic_tags(analysis_response)))

            # 7. Insertar en la base de datos
            format_id = await self._insert_format_to_db(
                format_name=format_name,
                description=description,
                reference_video_path=reference_path,
                analysis_id=analysis_response.analysis_id,
                analysis_response=analysis_response,
                technical_metadata=technical_metadata,
                replication_prompt=replication_prompt,
                negative_prompt=negative_prompt,
                recommended_model=recommended_model,
                category=category,
                tags=tags,
                use_case=use_case,
                is_template=is_template,
            )

            logger.info(f"Formato capturado exitosamente: {format_name} (ID: {format_id})")

            return {
                "format_id": format_id,
                "format_name": format_name,
                "analysis_id": analysis_response.analysis_id,
                "category": category,
                "tags": tags,
                "replication_prompt": replication_prompt,
                "recommended_model": recommended_model,
                "technical_metadata": {
                    "duration_seconds": technical_metadata.get("duration_seconds"),
                    "resolution": technical_metadata.get("resolution"),
                    "aspect_ratio": technical_metadata.get("aspect_ratio"),
                    "fps": technical_metadata.get("fps"),
                },
                "message": f"Formato '{format_name}' capturado exitosamente",
            }

        except Exception as e:
            logger.error(f"Error capturando formato {format_name}: {str(e)}", exc_info=True)
            raise

    async def _save_reference_video(self, format_name: str, video_base64: str) -> str:
        """Guarda el video de referencia en disco."""
        try:
            # Extraer datos del base64
            if "base64," in video_base64:
                video_base64 = video_base64.split("base64,")[1]

            video_bytes = base64.b64decode(video_base64)

            # Generar nombre de archivo único
            file_hash = hashlib.md5(video_bytes).hexdigest()[:8]
            safe_name = format_name.lower().replace(" ", "_").replace("-", "_")
            filename = f"{safe_name}_{file_hash}.mp4"
            file_path = self.upload_dir / filename

            # Guardar archivo
            with open(file_path, "wb") as f:
                f.write(video_bytes)

            return str(file_path)

        except Exception as e:
            logger.error(f"Error guardando video de referencia: {str(e)}")
            return None

    def _generate_replication_prompt(self, analysis: Any) -> str:
        """
        Genera un prompt optimizado para replicar el estilo del video.
        """
        prompt_parts = []

        # Descripción general
        if analysis.overall_description:
            prompt_parts.append(f"Create a video: {analysis.overall_description}")

        # Estilo visual
        if analysis.visual_style:
            prompt_parts.append(f"Visual style: {analysis.visual_style}")

        # Análisis de composición
        if hasattr(analysis, "composition_analysis") and analysis.composition_analysis:
            prompt_parts.append(f"Composition: {analysis.composition_analysis}")

        # Análisis de iluminación
        if hasattr(analysis, "lighting_analysis") and analysis.lighting_analysis:
            prompt_parts.append(f"Lighting: {analysis.lighting_analysis}")

        # Análisis de movimiento
        if analysis.motion_analysis:
            prompt_parts.append(f"Motion: {analysis.motion_analysis}")

        # Estado de ánimo
        if analysis.mood_and_tone:
            prompt_parts.append(f"Mood: {analysis.mood_and_tone}")

        # Unir todo
        replication_prompt = ". ".join(prompt_parts)

        # Limitar longitud
        if len(replication_prompt) > 2000:
            replication_prompt = replication_prompt[:1997] + "..."

        return replication_prompt

    def _generate_negative_prompt(self, analysis: Any) -> str:
        """
        Genera un prompt negativo basado en lo que NO se debe incluir.
        """
        negative_elements = [
            "low quality",
            "blurry",
            "pixelated",
            "distorted",
            "watermark",
            "text overlay (unless specified)",
        ]

        # Si la calidad técnica indica problemas, no repetirlos
        if analysis.technical_quality and "low" in analysis.technical_quality.lower():
            negative_elements.append("poor lighting")

        return ", ".join(negative_elements)

    def _determine_recommended_model(self, analysis: Any, category: str) -> str:
        """
        Determina el modelo Veo recomendado basado en el análisis y categoría.
        """
        # Si es contenido simple o de redes sociales, usar modelo rápido
        if category in ["promotional", "social_media"] and analysis.estimated_duration and analysis.estimated_duration < 20:
            return "veo-3.0-fast-generate-001"

        # Para contenido de alta calidad o educativo, usar modelo estándar
        return "veo-3.0-generate-preview"

    def _extract_automatic_tags(self, analysis: Any) -> List[str]:
        """
        Extrae tags automáticamente del análisis.
        """
        tags = []

        # Tags de temas de contenido
        if analysis.content_themes:
            tags.extend([theme.lower().replace(" ", "-") for theme in analysis.content_themes])

        # Tags de estilo visual
        if analysis.visual_style:
            if "professional" in analysis.visual_style.lower():
                tags.append("professional")
            if "animated" in analysis.visual_style.lower():
                tags.append("animation")
            if "real" in analysis.visual_style.lower() or "person" in analysis.visual_style.lower():
                tags.append("real-person")

        # Tags de duración
        if analysis.estimated_duration:
            if analysis.estimated_duration < 15:
                tags.append("short-form")
            elif analysis.estimated_duration > 60:
                tags.append("long-form")
            else:
                tags.append("medium-form")

        return list(set(tags))

    async def _insert_format_to_db(
        self,
        format_name: str,
        description: Optional[str],
        reference_video_path: Optional[str],
        analysis_id: str,
        analysis_response: Any,
        technical_metadata: Dict,
        replication_prompt: str,
        negative_prompt: str,
        recommended_model: str,
        category: str,
        tags: List[str],
        use_case: Optional[str],
        is_template: bool,
    ) -> int:
        """Inserta el formato en la base de datos."""

        query = text("""
            INSERT INTO video_formats (
                format_name, description, reference_video_path, analysis_id,
                duration_seconds, resolution, aspect_ratio, fps, frame_count,
                file_size_bytes, format, codec, color_space,
                overall_description, visual_style, technical_quality,
                content_themes, mood_and_tone,
                composition_analysis, lighting_analysis, color_palette,
                camera_movements, transition_style,
                keyframes_count, keyframes_data,
                motion_analysis, motion_intensity, scene_transitions,
                has_audio, audio_analysis,
                replication_prompt, negative_prompt,
                recommended_veo_model, recommended_resolution, recommended_duration,
                category, tags, use_case, is_template
            ) VALUES (
                :format_name, :description, :reference_video_path, :analysis_id,
                :duration_seconds, :resolution, :aspect_ratio, :fps, :frame_count,
                :file_size_bytes, :format, :codec, :color_space,
                :overall_description, :visual_style, :technical_quality,
                :content_themes, :mood_and_tone,
                :composition_analysis, :lighting_analysis, :color_palette,
                :camera_movements, :transition_style,
                :keyframes_count, :keyframes_data,
                :motion_analysis, :motion_intensity, :scene_transitions,
                :has_audio, :audio_analysis,
                :replication_prompt, :negative_prompt,
                :recommended_veo_model, :recommended_resolution, :recommended_duration,
                :category, :tags, :use_case, :is_template
            )
            RETURNING id
        """)

        # Preparar keyframes_data como JSON
        keyframes_data = None
        if analysis_response.keyframes_analysis:
            keyframes_data = json.dumps([
                {
                    "frame_number": kf.get("frame_number"),
                    "timestamp": kf.get("timestamp"),
                    "description": kf.get("description"),
                }
                for kf in analysis_response.keyframes_analysis
            ])

        result = await self.db.execute(query, {
            "format_name": format_name,
            "description": description,
            "reference_video_path": reference_video_path,
            "analysis_id": analysis_id,
            "duration_seconds": technical_metadata.get("duration_seconds"),
            "resolution": technical_metadata.get("resolution"),
            "aspect_ratio": technical_metadata.get("aspect_ratio"),
            "fps": technical_metadata.get("fps"),
            "frame_count": technical_metadata.get("frame_count"),
            "file_size_bytes": technical_metadata.get("file_size_bytes"),
            "format": technical_metadata.get("format"),
            "codec": technical_metadata.get("codec"),
            "color_space": technical_metadata.get("color_space"),
            "overall_description": analysis_response.overall_description,
            "visual_style": analysis_response.visual_style,
            "technical_quality": analysis_response.technical_quality,
            "content_themes": analysis_response.content_themes,
            "mood_and_tone": analysis_response.mood_and_tone,
            "composition_analysis": getattr(analysis_response, "composition_analysis", None),
            "lighting_analysis": getattr(analysis_response, "lighting_analysis", None),
            "color_palette": getattr(analysis_response, "color_palette", None),
            "camera_movements": getattr(analysis_response, "camera_movements", None),
            "transition_style": getattr(analysis_response, "transition_style", None),
            "keyframes_count": len(analysis_response.keyframes_analysis) if analysis_response.keyframes_analysis else 0,
            "keyframes_data": keyframes_data,
            "motion_analysis": analysis_response.motion_analysis,
            "motion_intensity": getattr(analysis_response, "motion_intensity", None),
            "scene_transitions": analysis_response.scene_transitions,
            "has_audio": getattr(analysis_response, "has_audio", False),
            "audio_analysis": getattr(analysis_response, "audio_analysis", None),
            "replication_prompt": replication_prompt,
            "negative_prompt": negative_prompt,
            "recommended_veo_model": recommended_model,
            "recommended_resolution": technical_metadata.get("resolution", "720p"),
            "recommended_duration": int(analysis_response.estimated_duration) if analysis_response.estimated_duration else None,
            "category": category,
            "tags": tags,
            "use_case": use_case,
            "is_template": is_template,
        })

        self.db.commit()

        format_id = result.scalar_one()
        return format_id

    def get_format_by_name(self, format_name: str) -> Optional[Dict[str, Any]]:
        """Obtiene un formato por su nombre."""
        query = text("""
            SELECT * FROM video_formats
            WHERE format_name = :format_name AND is_active = true
        """)

        result = self.db.execute(query, {"format_name": format_name})
        row = result.fetchone()

        if row:
            return dict(row._mapping)
        return None

    def list_formats(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_template: Optional[bool] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Lista formatos disponibles con filtros opcionales."""

        conditions = ["is_active = true"]
        params = {}

        if category:
            conditions.append("category = :category")
            params["category"] = category

        if tags:
            conditions.append("tags && :tags")
            params["tags"] = tags

        if is_template is not None:
            conditions.append("is_template = :is_template")
            params["is_template"] = is_template

        where_clause = " AND ".join(conditions)

        query = text(f"""
            SELECT
                id, format_name, description, category, tags,
                aspect_ratio, recommended_duration, visual_style,
                mood_and_tone, usage_count, success_rate,
                is_template, created_at
            FROM video_formats
            WHERE {where_clause}
            ORDER BY is_template DESC, success_rate DESC, usage_count DESC
            LIMIT :limit
        """)

        params["limit"] = limit

        result = self.db.execute(query, params)

        return [dict(row._mapping) for row in result.fetchall()]

    def replicate_format(
        self,
        format_id: int,
        custom_prompt_additions: Optional[str] = None,
        override_duration: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Obtiene la configuración necesaria para replicar un formato.

        Args:
            format_id: ID del formato a replicar
            custom_prompt_additions: Adiciones personalizadas al prompt
            override_duration: Sobreescribir duración recomendada

        Returns:
            Dict con toda la configuración para generar el video
        """
        # Obtener formato
        query = text("SELECT * FROM video_formats WHERE id = :id AND is_active = true")
        result = self.db.execute(query, {"id": format_id})
        row = result.fetchone()

        if not row:
            raise ValueError(f"Formato con ID {format_id} no encontrado")

        format_data = dict(row._mapping)

        # Incrementar contador de uso
        self.db.execute(
            text("SELECT increment_format_usage(:format_id)"),
            {"format_id": format_id}
        )
        self.db.commit()

        # Preparar prompt final
        final_prompt = format_data["replication_prompt"]
        if custom_prompt_additions:
            final_prompt = f"{final_prompt}. {custom_prompt_additions}"

        # Preparar configuración de generación
        generation_config = {
            "prompt": final_prompt,
            "negative_prompt": format_data["negative_prompt"],
            "aspect_ratio": format_data["aspect_ratio"],
            "resolution": format_data["recommended_resolution"],
            "duration_seconds": override_duration or format_data["recommended_duration"],
            "veo_model": format_data["recommended_veo_model"],
        }

        return {
            "format_id": format_id,
            "format_name": format_data["format_name"],
            "category": format_data["category"],
            "generation_config": generation_config,
            "technical_reference": {
                "original_resolution": format_data["resolution"],
                "original_duration": format_data["duration_seconds"],
                "visual_style": format_data["visual_style"],
                "mood_and_tone": format_data["mood_and_tone"],
            },
            "usage_count": format_data["usage_count"] + 1,
            "success_rate": format_data["success_rate"],
        }

    def update_format_success(self, format_id: int, was_successful: bool):
        """Actualiza la tasa de éxito de un formato."""
        self.db.execute(
            text("SELECT update_format_success_rate(:format_id, :was_successful)"),
            {"format_id": format_id, "was_successful": was_successful}
        )
        self.db.commit()
