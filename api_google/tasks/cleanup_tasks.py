"""
Tareas de limpieza y health check para operaciones de video
"""
import time
import requests
from datetime import datetime, timedelta
from celery.utils.log import get_task_logger
from celery_app import celery_app
from models.database import VideoOperation, get_database_session
from utils.config import get_settings

logger = get_task_logger(__name__)
settings = get_settings()

def verify_google_operation_status(google_operation_id: str) -> dict:
    """
    Verifica el estado real de una operación en Google Veo API
    
    Args:
        google_operation_id: ID de operación de Google
        
    Returns:
        dict con información del estado:
        - exists: bool - si la operación existe en Google
        - done: bool - si está completada (solo si exists=True)
        - state: str - estado de la operación (PROCESSING, COMPLETED, FAILED)
        - reason: str - razón si no existe
    """
    try:
        check_url = f"https://generativelanguage.googleapis.com/v1beta/operations/{google_operation_id}"
        headers = {"x-goog-api-key": settings.GOOGLE_API_KEY}
        
        response = requests.get(check_url, headers=headers, timeout=10)
        
        # Si la operación no existe en Google (404)
        if response.status_code == 404:
            return {
                "exists": False, 
                "reason": "Operation not found in Google API",
                "status_code": 404
            }
        
        # Si hay error de autenticación u otro error
        if response.status_code != 200:
            return {
                "exists": False,
                "reason": f"Google API error: {response.status_code}",
                "status_code": response.status_code
            }
        
        # Parsear respuesta exitosa
        data = response.json()
        metadata = data.get("metadata", {})
        
        return {
            "exists": True,
            "done": data.get("done", False),
            "state": metadata.get("state", "UNKNOWN"),
            "create_time": metadata.get("createTime"),
            "update_time": metadata.get("updateTime")
        }
        
    except requests.exceptions.Timeout:
        return {
            "exists": False,
            "reason": "Google API timeout",
            "status_code": "timeout"
        }
    except requests.exceptions.RequestException as e:
        return {
            "exists": False,
            "reason": f"Request error: {str(e)}",
            "status_code": "request_error"
        }
    except Exception as e:
        return {
            "exists": False,
            "reason": f"Unknown error: {str(e)}",
            "status_code": "unknown_error"
        }

@celery_app.task
def cleanup_stuck_operations():
    """
    Busca y limpia operaciones que están 'stuck' (colgadas)
    
    NUEVA LÓGICA CON VERIFICACIÓN DE GOOGLE API:
    1. Operaciones sin google_operation_id > 20 minutos -> failed 
    2. Operaciones con google_operation_id -> verificar estado real en Google API:
       - Si Google dice que no existe/falló -> failed inmediatamente
       - Si Google dice que está procesando pero > 60 min -> failed por timeout
       - Si Google dice que está completada -> actualizar a completed
    """
    session = get_database_session()
    try:
        current_time = datetime.utcnow()
        total_cleaned = 0
        total_completed = 0
        
        # 1. Operaciones sin google_operation_id > 20 minutos
        twenty_min_ago = current_time - timedelta(minutes=20)
        stuck_without_google_id = session.query(VideoOperation).filter(
            VideoOperation.status == 'processing',
            VideoOperation.google_operation_id.is_(None),
            VideoOperation.created_at < twenty_min_ago
        ).all()
        
        for operation in stuck_without_google_id:
            operation.status = 'failed'
            operation.error_message = f'Task stuck without Google operation ID for >20 minutes. Auto-cleaned at {current_time}'
            operation.failed_at = current_time
            total_cleaned += 1
            logger.warning(f"🧹 Auto-cleaned stuck operation (no Google ID): {operation.id}")
        
        # 2. Operaciones con google_operation_id - verificar estado real en Google
        operations_with_google_id = session.query(VideoOperation).filter(
            VideoOperation.status == 'processing',
            VideoOperation.google_operation_id.isnot(None)
        ).all()
        
        for operation in operations_with_google_id:
            google_status = verify_google_operation_status(operation.google_operation_id)
            
            if not google_status["exists"]:
                # Google no encuentra la operación -> failed
                operation.status = 'failed'
                operation.error_message = f'Google API verification failed: {google_status["reason"]}. Auto-cleaned at {current_time}'
                operation.failed_at = current_time
                total_cleaned += 1
                logger.warning(f"🧹 Auto-cleaned operation (Google not found): {operation.id} - {google_status['reason']}")
                
            elif google_status["done"]:
                # Google dice que está completada -> verificar si realmente completó
                if google_status["state"] == "COMPLETED":
                    # Marcar como completada (asumiendo que el video fue descargado)
                    operation.status = 'completed'
                    operation.completed_at = current_time
                    total_completed += 1
                    logger.info(f"✅ Auto-completed operation found in Google: {operation.id}")
                else:
                    # Google dice done=True pero estado no es COMPLETED -> probablemente falló
                    operation.status = 'failed'
                    operation.error_message = f'Google operation done but state is {google_status["state"]}. Auto-cleaned at {current_time}'
                    operation.failed_at = current_time
                    total_cleaned += 1
                    logger.warning(f"🧹 Auto-cleaned operation (Google done but not completed): {operation.id}")
                    
            else:
                # Google dice que aún está procesando -> verificar timeout
                age_minutes = (current_time - operation.created_at).total_seconds() / 60
                if age_minutes > 60:  # Más de 60 minutos procesando
                    operation.status = 'failed'
                    operation.error_message = f'Task processing in Google for >60 minutes (Google state: {google_status["state"]}). Auto-cleaned at {current_time}'
                    operation.failed_at = current_time
                    total_cleaned += 1
                    logger.warning(f"🧹 Auto-cleaned operation (Google timeout): {operation.id} - {age_minutes:.1f} min")
                else:
                    # Aún procesando pero dentro del límite de tiempo -> dejar como está
                    logger.debug(f"✅ Operation still processing in Google (within time limit): {operation.id} - {age_minutes:.1f} min - State: {google_status['state']}")
        
        session.commit()
        
        if total_cleaned > 0 or total_completed > 0:
            logger.info(f"🧹 Cleanup completed: {total_cleaned} failed, {total_completed} completed operations processed")
        else:
            logger.debug("✅ Cleanup check: No stuck operations found")
            
        return {
            "cleaned_operations": total_cleaned,
            "completed_operations": total_completed,
            "total_processed": total_cleaned + total_completed
        }
        
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error in cleanup_stuck_operations: {e}")
        raise
    finally:
        session.close()

@celery_app.task
def cleanup_old_error_operations():
    """
    Limpia operaciones antiguas en estado 'error' o 'failed' > 24 horas

    Esto evita que la BD se llene de operaciones fallidas antiguas
    que ya no son relevantes y solo ocupan espacio.
    """
    session = get_database_session()
    try:
        current_time = datetime.utcnow()
        one_day_ago = current_time - timedelta(days=1)

        # Buscar operaciones error/failed > 24 horas
        old_errors = session.query(VideoOperation).filter(
            VideoOperation.status.in_(['error', 'failed']),
            VideoOperation.created_at < one_day_ago
        ).all()

        deleted_count = len(old_errors)

        if deleted_count > 0:
            # Eliminar operaciones antiguas
            for operation in old_errors:
                session.delete(operation)

            session.commit()
            logger.info(f"🗑️ Cleanup: Deleted {deleted_count} old error/failed operations (>24h)")
        else:
            logger.debug("✅ Cleanup: No old error/failed operations to delete")

        return {
            "deleted_operations": deleted_count,
            "cutoff_date": one_day_ago.isoformat()
        }

    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error in cleanup_old_error_operations: {e}")
        raise
    finally:
        session.close()

@celery_app.task
def requeue_stuck_queued_operations():
    """
    Re-encola operaciones que están stuck en estado 'queued' > 10 minutos

    Si una operación está en queued por más de 1 hora, se marca como failed
    porque probablemente el worker no la procesará nunca.
    """
    session = get_database_session()
    try:
        current_time = datetime.utcnow()
        ten_min_ago = current_time - timedelta(minutes=10)
        one_hour_ago = current_time - timedelta(hours=1)

        # Buscar operaciones queued > 10 minutos
        stuck_queued = session.query(VideoOperation).filter(
            VideoOperation.status == 'queued',
            VideoOperation.created_at < ten_min_ago
        ).all()

        failed_count = 0

        for operation in stuck_queued:
            age_minutes = (current_time - operation.created_at).total_seconds() / 60

            # Si > 1 hora, marcar como failed
            if operation.created_at < one_hour_ago:
                operation.status = 'failed'
                operation.error_message = f'Worker did not process operation for >1 hour. Auto-failed at {current_time}'
                operation.failed_at = current_time
                failed_count += 1
                logger.warning(f"❌ Auto-failed stuck queued operation: {operation.id} - {age_minutes:.1f} min in queue")
            else:
                # Entre 10 min y 1 hora: solo log warning (podría estar en queue legítimamente)
                logger.warning(f"⚠️ Operation stuck in queue: {operation.id} - {age_minutes:.1f} min")

        if failed_count > 0:
            session.commit()
            logger.info(f"🗑️ Requeue cleanup: Marked {failed_count} stuck queued operations as failed")

        return {
            "failed_operations": failed_count,
            "total_stuck_queued": len(stuck_queued)
        }

    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error in requeue_stuck_queued_operations: {e}")
        raise
    finally:
        session.close()

@celery_app.task
def cleanup_old_google_api_calls():
    """
    Limpia API calls antiguos > 7 días

    Mantiene solo los últimos 7 días de logs de API calls
    para evitar crecimiento infinito de la tabla.
    """
    from models.database import GoogleApiCall

    session = get_database_session()
    try:
        current_time = datetime.utcnow()
        seven_days_ago = current_time - timedelta(days=7)

        # Buscar API calls > 7 días
        old_calls = session.query(GoogleApiCall).filter(
            GoogleApiCall.created_at < seven_days_ago
        ).all()

        deleted_count = len(old_calls)

        if deleted_count > 0:
            # Eliminar API calls antiguos
            for call in old_calls:
                session.delete(call)

            session.commit()
            logger.info(f"🗑️ Cleanup: Deleted {deleted_count} old google_api_calls (>7 days)")
        else:
            logger.debug("✅ Cleanup: No old google_api_calls to delete")

        return {
            "deleted_api_calls": deleted_count,
            "cutoff_date": seven_days_ago.isoformat()
        }

    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error in cleanup_old_google_api_calls: {e}")
        raise
    finally:
        session.close()

@celery_app.task
def health_check_operations():
    """
    Health check general para operaciones de video
    """
    session = get_database_session()
    try:
        current_time = datetime.utcnow()

        # Contar operaciones por estado
        processing_count = session.query(VideoOperation).filter(
            VideoOperation.status == 'processing'
        ).count()

        completed_count = session.query(VideoOperation).filter(
            VideoOperation.status == 'completed'
        ).count()

        failed_count = session.query(VideoOperation).filter(
            VideoOperation.status == 'failed'
        ).count()

        error_count = session.query(VideoOperation).filter(
            VideoOperation.status == 'error'
        ).count()

        queued_count = session.query(VideoOperation).filter(
            VideoOperation.status == 'queued'
        ).count()

        # Operaciones recientes (últimas 24 horas)
        yesterday = current_time - timedelta(hours=24)
        recent_count = session.query(VideoOperation).filter(
            VideoOperation.created_at >= yesterday
        ).count()

        health_data = {
            "timestamp": current_time.isoformat(),
            "processing": processing_count,
            "completed": completed_count,
            "failed": failed_count,
            "error": error_count,
            "queued": queued_count,
            "recent_24h": recent_count
        }

        logger.info(f"📊 Health check: {health_data}")
        return health_data

    except Exception as e:
        logger.error(f"❌ Error in health_check_operations: {e}")
        raise
    finally:
        session.close()