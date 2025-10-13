"""
Endpoints para manejo de rate limiting de Google Veo 3.0
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any
from services.rate_limiter import veo_rate_limiter, video_generation_queue
from utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/api/v1/rate-limiting", tags=["rate-limiting"])

@router.get("/status")
async def get_rate_limiting_status() -> Dict[str, Any]:
    """
    Obtiene el estado actual del rate limiting
    """
    try:
        # Obtener estadísticas del rate limiter
        rate_limiter_stats = await veo_rate_limiter.get_usage_stats()
        
        # Obtener estado de la cola
        queue_status = await video_generation_queue.get_queue_status()
        
        return {
            "status": "success",
            "rate_limiter": rate_limiter_stats,
            "queue": queue_status,
            "service": "Google Veo 3.0 Rate Limiting"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estado de rate limiting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-request")
async def check_request_availability(operation_type: str = "video_generation") -> Dict[str, Any]:
    """
    Verifica si se puede hacer una request respetando los límites
    """
    try:
        can_proceed = await veo_rate_limiter.can_make_request(operation_type)
        
        return {
            "status": "success",
            "can_proceed": can_proceed["can_proceed"],
            "reason": can_proceed["reason"],
            "details": can_proceed
        }
        
    except Exception as e:
        logger.error(f"Error verificando disponibilidad de request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/record-request")
async def record_request(operation_type: str = "video_generation") -> Dict[str, Any]:
    """
    Registra una request realizada
    """
    try:
        record_result = await veo_rate_limiter.record_request(operation_type)
        
        return {
            "status": "success",
            "recorded": record_result["success"],
            "details": record_result
        }
        
    except Exception as e:
        logger.error(f"Error registrando request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-to-queue")
async def add_to_queue(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Agrega una request a la cola de procesamiento
    """
    try:
        queue_result = await video_generation_queue.add_video_request(request_data)
        
        return {
            "status": "success",
            "queued": queue_result["success"],
            "details": queue_result
        }
        
    except Exception as e:
        logger.error(f"Error agregando request a la cola: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue-status")
async def get_queue_status() -> Dict[str, Any]:
    """
    Obtiene el estado de la cola de procesamiento
    """
    try:
        queue_status = await video_generation_queue.get_queue_status()
        
        return {
            "status": "success",
            "queue": queue_status
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estado de la cola: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-queue-processing")
async def start_queue_processing(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Inicia el procesamiento de la cola en background
    """
    try:
        # Iniciar procesamiento en background
        background_tasks.add_task(video_generation_queue.process_queue)
        
        return {
            "status": "success",
            "message": "Procesamiento de cola iniciado en background",
            "queue_status": await video_generation_queue.get_queue_status()
        }
        
    except Exception as e:
        logger.error(f"Error iniciando procesamiento de cola: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/limits")
async def get_api_limits() -> Dict[str, Any]:
    """
    Obtiene información sobre los límites de la API
    """
    try:
        return {
            "status": "success",
            "limits": {
                "google_veo_3": {
                    "requests_per_minute": 10,
                    "requests_per_day": 500,
                    "video_duration": "4, 6, o 8 segundos",
                    "max_image_size": "20 MB",
                    "supported_formats": ["MP4", "WebM"],
                    "resolutions": ["720p", "1080p"]
                },
                "google_veo_3_fast": {
                    "requests_per_minute": 10,
                    "requests_per_day": 500,
                    "video_duration": "4, 6, o 8 segundos",
                    "max_image_size": "20 MB",
                    "supported_formats": ["MP4", "WebM"],
                    "resolutions": ["720p", "1080p"],
                    "optimization": "Velocidad y casos empresariales"
                }
            },
            "note": "Límites oficiales de Google Veo 3.0 según documentación"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo límites de API: {e}")
        raise HTTPException(status_code=500, detail=str(e))
