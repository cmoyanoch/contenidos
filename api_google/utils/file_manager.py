"""
Gestor de archivos local para imágenes y videos
Alternativa al Google File API para desarrollo y testing
"""
import os
import base64
import uuid
from pathlib import Path
from typing import Tuple, Optional
import mimetypes
from datetime import datetime

class LocalFileManager:
    """Gestiona archivos localmente en el sistema de archivos"""

    def __init__(self, base_upload_dir: str = "uploads"):
        self.base_upload_dir = Path(base_upload_dir)
        self.base_upload_dir.mkdir(exist_ok=True, parents=True)

        # Subdirectorios organizados
        self.images_dir = self.base_upload_dir / "banana" / "video"
        self.videos_dir = self.base_upload_dir / "videos" / "clip"
        self.temp_dir = self.base_upload_dir / "temp"

        # Crear subdirectorios
        for directory in [self.images_dir, self.videos_dir, self.temp_dir]:
            directory.mkdir(exist_ok=True, parents=True)

    def save_base64_image(self, image_data: str, operation_id: str) -> Tuple[str, str, str]:
        """
        Guarda una imagen base64 en el sistema local

        Args:
            image_data: Datos base64 con o sin prefijos
            operation_id: ID único de la operación

        Returns:
            Tuple con (local_path, file_uri, mime_type)
        """
                    # Limpiar y detectar MIME type
        clean_base64, mime_type = self._clean_base64(image_data)

        # Generar nombre de archivo único
        extension = mimetypes.guess_extension(mime_type) or ".jpg"
        filename = f"image_{operation_id}{extension}"

        # Path completo
        local_path = self.images_dir / filename

        # Guardar archivo
        image_bytes = base64.b64decode(clean_base64)
        with open(local_path, 'wb') as f:
            f.write(image_bytes)

        # Generar URI local (para compatibilidad con el API)
        file_uri = f"file://localhost/app/uploads/banana/video/{filename}"

        return str(local_path), file_uri, mime_type

    def save_video_file(self, video_url: str, operation_id: str, scene_index: int = None) -> str:
        """
        Descarga y guarda un video desde URL

        Args:
            video_url: URL del video generado por Google
            operation_id: ID de la operación
            scene_index: Índice de la escena (opcional)

        Returns:
            Path local del video guardado
        """
        import requests

        # Generar nombre único con índice de escena si está disponible
        if scene_index is not None:
            filename = f"clip_{operation_id}_scene_{scene_index}.mp4"
        else:
            filename = f"clip_{operation_id}.mp4"

        local_path = self.videos_dir / filename

        # Descargar video
        response = requests.get(video_url, stream=True, timeout=300)
        response.raise_for_status()

        # Guardar en chunks
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return str(local_path)

    def get_file_url(self, local_path: str, base_url: str = "http://localhost:8001") -> str:
        """
        Convierte path local en URL servible

        Args:
            local_path: Path completo del archivo
            base_url: URL base del servidor

        Returns:
            URL pública del archivo
        """
        path = Path(local_path)
        relative_path = path.relative_to(self.base_upload_dir)
        return f"{base_url}/uploads/{relative_path}"

    def cleanup_old_files(self, max_age_hours: int = 24):
        """
        Limpia archivos antiguos para liberar espacio

        Args:
            max_age_hours: Edad máxima en horas antes de eliminar
        """
        import time

        max_age_seconds = max_age_hours * 3600
        current_time = time.time()

        for directory in [self.images_dir, self.videos_dir, self.temp_dir]:
            for file_path in directory.iterdir():
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > max_age_seconds:
                        file_path.unlink()
                        print(f"🗑️ Archivo eliminado: {file_path}")

    def _clean_base64(self, image_data: str) -> Tuple[str, str]:
        """
        Limpia datos base64 y detecta MIME type

        Args:
            image_data: Datos con posibles prefijos

        Returns:
            Tuple con (base64_limpio, mime_type)
        """
        import re

        # Detectar patrón data:mime/type;base64,
        data_url_pattern = r'^data:([^;]+);base64,(.+)$'
        match = re.match(data_url_pattern, image_data)

        if match:
            mime_type = match.group(1)
            clean_base64 = match.group(2)
        else:
            # Remover prefijo base64, si existe
            if image_data.startswith('base64,'):
                clean_base64 = image_data[7:]
            else:
                clean_base64 = image_data
            mime_type = 'image/jpeg'  # Default

        # Remover whitespace
        clean_base64 = ''.join(clean_base64.split())

        return clean_base64, mime_type

# Instancia singleton
file_manager = LocalFileManager()
