"""
Servicio de Rate Limiting para Google Veo 3.0
Maneja los límites de RPM (10/minuto) y RPD (500/día)
"""
import time
import asyncio
from collections import defaultdict
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from utils.logger import setup_logger

logger = setup_logger(__name__)

class VeoRateLimiter:
    """Rate limiter para Google Veo 3.0 API"""
    
    def __init__(self):
        # Límites oficiales de Google Veo 3.0
        self.max_rpm = 10  # Requests per minute
        self.max_rpd = 500  # Requests per day
        
        # Almacenamiento de requests
        self.requests_per_minute = defaultdict(list)
        self.requests_per_day = defaultdict(int)
        
        # Cache de estado
        self._cache = {}
        self._cache_expiry = 60  # 1 minuto
    
    async def can_make_request(self, operation_type: str = "video_generation") -> Dict[str, Any]:
        """
        Verifica si se puede hacer una request respetando los límites
        
        Args:
            operation_type: Tipo de operación (video_generation, image_analysis, etc.)
            
        Returns:
            Dict con información sobre si se puede hacer la request
        """
        try:
            now = time.time()
            today = datetime.now().strftime("%Y-%m-%d")
            
            # Verificar límite diario
            daily_requests = self.requests_per_day.get(today, 0)
            if daily_requests >= self.max_rpd:
                logger.warning(f"⚠️ Límite diario alcanzado: {daily_requests}/{self.max_rpd}")
                return {
                    "can_proceed": False,
                    "reason": "daily_limit_exceeded",
                    "daily_requests": daily_requests,
                    "max_daily": self.max_rpd,
                    "reset_time": "midnight_pacific",
                    "wait_time_seconds": self._get_seconds_until_midnight()
                }
            
            # Verificar límite por minuto
            minute_ago = now - 60
            recent_requests = [
                req_time for req_time in self.requests_per_minute.get(today, [])
                if req_time > minute_ago
            ]
            
            if len(recent_requests) >= self.max_rpm:
                # Calcular tiempo de espera
                oldest_request = min(recent_requests)
                wait_time = 60 - (now - oldest_request)
                
                logger.warning(f"⚠️ Límite por minuto alcanzado: {len(recent_requests)}/{self.max_rpm}")
                return {
                    "can_proceed": False,
                    "reason": "minute_limit_exceeded",
                    "minute_requests": len(recent_requests),
                    "max_minute": self.max_rpm,
                    "wait_time_seconds": max(0, wait_time),
                    "oldest_request_age": now - oldest_request
                }
            
            # ✅ Se puede proceder
            return {
                "can_proceed": True,
                "reason": "within_limits",
                "daily_requests": daily_requests,
                "minute_requests": len(recent_requests),
                "max_daily": self.max_rpd,
                "max_minute": self.max_rpm,
                "remaining_daily": self.max_rpd - daily_requests,
                "remaining_minute": self.max_rpm - len(recent_requests)
            }
            
        except Exception as e:
            logger.error(f"❌ Error verificando límites: {e}")
            return {
                "can_proceed": False,
                "reason": "error",
                "error": str(e)
            }
    
    async def record_request(self, operation_type: str = "video_generation") -> Dict[str, Any]:
        """
        Registra una request realizada
        
        Args:
            operation_type: Tipo de operación realizada
            
        Returns:
            Dict con información del registro
        """
        try:
            now = time.time()
            today = datetime.now().strftime("%Y-%m-%d")
            
            # Registrar request
            self.requests_per_minute[today].append(now)
            self.requests_per_day[today] += 1
            
            # Limpiar requests antiguas (más de 1 hora)
            hour_ago = now - 3600
            self.requests_per_minute[today] = [
                req_time for req_time in self.requests_per_minute[today]
                if req_time > hour_ago
            ]
            
            logger.info(f"✅ Request registrada: {operation_type}")
            logger.info(f"   - Requests hoy: {self.requests_per_day[today]}/{self.max_rpd}")
            logger.info(f"   - Requests último minuto: {len([r for r in self.requests_per_minute[today] if r > now - 60])}/{self.max_rpm}")
            
            return {
                "success": True,
                "operation_type": operation_type,
                "timestamp": now,
                "daily_requests": self.requests_per_day[today],
                "minute_requests": len([r for r in self.requests_per_minute[today] if r > now - 60])
            }
            
        except Exception as e:
            logger.error(f"❌ Error registrando request: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_usage_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas de uso actual
        
        Returns:
            Dict con estadísticas detalladas
        """
        try:
            now = time.time()
            today = datetime.now().strftime("%Y-%m-%d")
            
            # Requests del día
            daily_requests = self.requests_per_day.get(today, 0)
            
            # Requests del último minuto
            minute_ago = now - 60
            recent_requests = [
                req_time for req_time in self.requests_per_minute.get(today, [])
                if req_time > minute_ago
            ]
            
            # Requests de la última hora
            hour_ago = now - 3600
            hourly_requests = [
                req_time for req_time in self.requests_per_minute.get(today, [])
                if req_time > hour_ago
            ]
            
            return {
                "current_time": datetime.now().isoformat(),
                "limits": {
                    "max_rpm": self.max_rpm,
                    "max_rpd": self.max_rpd
                },
                "usage": {
                    "daily_requests": daily_requests,
                    "minute_requests": len(recent_requests),
                    "hourly_requests": len(hourly_requests),
                    "remaining_daily": max(0, self.max_rpd - daily_requests),
                    "remaining_minute": max(0, self.max_rpm - len(recent_requests))
                },
                "percentages": {
                    "daily_usage": (daily_requests / self.max_rpd) * 100,
                    "minute_usage": (len(recent_requests) / self.max_rpm) * 100
                },
                "next_reset": {
                    "daily": "midnight_pacific",
                    "minute": f"{60 - (now % 60):.1f} seconds"
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo estadísticas: {e}")
            return {
                "error": str(e)
            }
    
    def _get_seconds_until_midnight(self) -> int:
        """Calcula segundos hasta medianoche (hora del Pacífico)"""
        try:
            # Hora del Pacífico (UTC-8)
            pacific_tz = timezone(timedelta(hours=-8))
            now_pacific = datetime.now(pacific_tz)
            
            # Medianoche del día siguiente
            tomorrow = now_pacific.date() + timedelta(days=1)
            midnight = datetime.combine(tomorrow, datetime.min.time())
            midnight = pacific_tz.localize(midnight)
            
            return int((midnight - now_pacific).total_seconds())
            
        except Exception:
            # Fallback: asumir 8 horas hasta medianoche
            return 8 * 3600

class VideoGenerationQueue:
    """Queue para manejar requests de generación de video con rate limiting"""
    
    def __init__(self):
        self.queue = asyncio.Queue()
        self.rate_limiter = VeoRateLimiter()
        self.is_processing = False
        self.processed_count = 0
    
    async def add_video_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Agrega una request a la cola
        
        Args:
            request_data: Datos de la request de video
            
        Returns:
            Dict con información de la request agregada
        """
        try:
            # Verificar si se puede procesar inmediatamente
            can_proceed = await self.rate_limiter.can_make_request()
            
            if can_proceed["can_proceed"]:
                # Procesar inmediatamente
                await self.rate_limiter.record_request()
                self.processed_count += 1
                
                return {
                    "success": True,
                    "processed_immediately": True,
                    "queue_position": 0,
                    "estimated_wait_time": 0,
                    "request_id": f"immediate_{int(time.time())}"
                }
            else:
                # Agregar a la cola
                request_id = f"queued_{int(time.time())}_{self.queue.qsize()}"
                request_data["request_id"] = request_id
                request_data["queued_at"] = time.time()
                
                await self.queue.put(request_data)
                
                return {
                    "success": True,
                    "processed_immediately": False,
                    "queue_position": self.queue.qsize(),
                    "estimated_wait_time": self._estimate_wait_time(),
                    "request_id": request_id,
                    "reason": can_proceed["reason"]
                }
                
        except Exception as e:
            logger.error(f"❌ Error agregando request a la cola: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_queue(self):
        """Procesa la cola de requests respetando los límites"""
        if self.is_processing:
            return
        
        self.is_processing = True
        logger.info("🔄 Iniciando procesamiento de cola de videos")
        
        try:
            while True:
                if not self.queue.empty():
                    # Verificar si se puede hacer una request
                    can_proceed = await self.rate_limiter.can_make_request()
                    
                    if can_proceed["can_proceed"]:
                        # Procesar siguiente request
                        request_data = await self.queue.get()
                        await self.rate_limiter.record_request()
                        self.processed_count += 1
                        
                        logger.info(f"✅ Request procesada desde cola: {request_data.get('request_id', 'unknown')}")
                        
                        # Aquí se procesaría la request real
                        # await self._process_video_request(request_data)
                        
                    else:
                        # Esperar antes del siguiente intento
                        wait_time = can_proceed.get("wait_time_seconds", 6)
                        logger.info(f"⏳ Esperando {wait_time:.1f} segundos antes del siguiente intento")
                        await asyncio.sleep(wait_time)
                else:
                    # Cola vacía, esperar un poco
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"❌ Error procesando cola: {e}")
        finally:
            self.is_processing = False
    
    def _estimate_wait_time(self) -> int:
        """Estima tiempo de espera en la cola"""
        queue_size = self.queue.qsize()
        if queue_size == 0:
            return 0
        
        # Asumir 6 segundos entre requests (respeta límite de 10 RPM)
        return queue_size * 6
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Obtiene estado de la cola"""
        return {
            "queue_size": self.queue.qsize(),
            "is_processing": self.is_processing,
            "processed_count": self.processed_count,
            "estimated_wait_time": self._estimate_wait_time(),
            "rate_limiter_stats": await self.rate_limiter.get_usage_stats()
        }

# Instancias globales
veo_rate_limiter = VeoRateLimiter()
video_generation_queue = VideoGenerationQueue()
