"""
Endpoints de optimización - NUEVOS, NO MODIFICAN LÓGICA EXISTENTE
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from services.enhanced_batch_service import enhanced_batch_service
from models.schemas import BatchImageAnalysisRequest, BatchImageAnalysisResponse
from utils.logger import setup_logger

logger = setup_logger(__name__)

# Importar instancia global de usage_monitor
def get_usage_monitor():
    """Obtiene la instancia de usage_monitor del app principal"""
    try:
        from main import usage_monitor_instance
        return usage_monitor_instance
    except ImportError:
        logger.warning("⚠️ usage_monitor_instance no disponible")
        return None

router = APIRouter(prefix="/optimization", tags=["optimization"])

@router.post("/batch-enhanced", response_model=BatchImageAnalysisResponse)
async def process_batch_enhanced(request: BatchImageAnalysisRequest):
    """
    Endpoint optimizado - NUEVO, NO MODIFICA LÓGICA EXISTENTE
    Procesa lotes de imágenes con rate limiting y circuit breaker
    """
    try:
        logger.info(f"🚀 Iniciando procesamiento mejorado de {len(request.items)} items")
        
        # Procesar con servicios mejorados
        results = await enhanced_batch_service.process_with_rate_limiting(request.items)
        
        return {
            "results": results,
            "optimized": True,
            "processing_stats": enhanced_batch_service.get_processing_stats(),
            "message": "Procesamiento optimizado completado"
        }
        
    except Exception as e:
        logger.error(f"❌ Error en procesamiento optimizado: {e}")
        raise HTTPException(status_code=500, detail=f"Error en procesamiento optimizado: {str(e)}")

@router.post("/batch-adaptive", response_model=BatchImageAnalysisResponse)
async def process_batch_adaptive(request: BatchImageAnalysisRequest):
    """
    Endpoint con delays adaptativos - NUEVO
    Ajusta delays automáticamente basado en errores
    """
    try:
        logger.info(f"�� Iniciando procesamiento adaptativo de {len(request.items)} items")
        
        # Procesar con delays adaptativos
        results = await enhanced_batch_service.process_with_adaptive_delays(request.items)
        
        return {
            "results": results,
            "optimized": True,
            "adaptive": True,
            "processing_stats": enhanced_batch_service.get_processing_stats(),
            "message": "Procesamiento adaptativo completado"
        }
        
    except Exception as e:
        logger.error(f"❌ Error en procesamiento adaptativo: {e}")
        raise HTTPException(status_code=500, detail=f"Error en procesamiento adaptativo: {str(e)}")

@router.get("/stats")
async def get_optimization_stats():
    """
    Obtiene estadísticas de optimización
    """
    try:
        usage_monitor = get_usage_monitor()
        usage_stats = usage_monitor.get_usage_stats() if usage_monitor else {"status": "disabled"}

        return {
            "enhanced_batch_stats": enhanced_batch_service.get_processing_stats(),
            "usage_monitor_stats": usage_stats,
            "timestamp": "2025-10-02T06:20:00Z"
        }

    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")

@router.post("/reset-stats")
async def reset_optimization_stats():
    """
    Reinicia estadísticas de optimización
    """
    try:
        enhanced_batch_service.reset_stats()
        
        return {
            "message": "Estadísticas reiniciadas exitosamente",
            "timestamp": "2025-10-02T06:20:00Z"
        }
        
    except Exception as e:
        logger.error(f"❌ Error reiniciando estadísticas: {e}")
        raise HTTPException(status_code=500, detail=f"Error reiniciando estadísticas: {str(e)}")

@router.get("/health")
async def get_optimization_health():
    """
    Estado de salud de los servicios de optimización
    """
    try:
        batch_stats = enhanced_batch_service.get_processing_stats()

        # Obtener stats del usage_monitor
        usage_monitor = get_usage_monitor()
        usage_stats = usage_monitor.get_usage_stats() if usage_monitor else None

        # Calcular error_rate desde batch_stats
        total_requests = batch_stats.get("total_requests", 0)
        failed_requests = batch_stats.get("failed_requests", 0)
        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0

        # Determinar estado de salud
        health_status = "healthy"
        if batch_stats["success_rate"] < 80:
            health_status = "degraded"
        if error_rate > 20:
            health_status = "unhealthy"

        # Si usage_monitor está activo, verificar sus métricas también
        usage_monitor_status = "disabled"
        if usage_stats:
            usage_monitor_status = "active"
            # Verificar errores del monitor
            if usage_stats.get("rate_limit_errors", 0) > 0:
                health_status = "degraded"
            if usage_stats.get("quota_errors", 0) > 0:
                health_status = "unhealthy"

        return {
            "status": health_status,
            "enhanced_batch_service": "active",
            "usage_monitor": usage_monitor_status,
            "success_rate": batch_stats["success_rate"],
            "error_rate": error_rate,
            "usage_monitor_stats": usage_stats if usage_stats else {"status": "disabled"},
            "timestamp": "2025-10-02T06:20:00Z"
        }
        
    except Exception as e:
        logger.error(f"❌ Error verificando salud: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2025-10-02T06:20:00Z"
        }
