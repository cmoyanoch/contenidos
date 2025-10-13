"""
Servicio mejorado de procesamiento por lotes - SIN CAMBIAR LÓGICA ORIGINAL
"""
import asyncio
from typing import List, Dict, Any
from services.batch_service import BatchImageAnalysisService
from services.rate_limiter import VeoRateLimiter
from services.circuit_breaker import veo_circuit_breaker
from utils.logger import setup_logger

logger = setup_logger(__name__)

class EnhancedBatchService(BatchImageAnalysisService):
    """Versión mejorada que usa servicios existentes sin modificar lógica original"""
    
    def __init__(self):
        super().__init__()
        self.rate_limiter = VeoRateLimiter()
        self.circuit_breaker = veo_circuit_breaker
        self.processing_stats = {
            "total_processed": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "rate_limited_requests": 0,
            "circuit_breaker_trips": 0
        }
    
    async def process_with_rate_limiting(self, items: List[Dict]) -> List[Dict]:
        """
        Procesa items con rate limiting y circuit breaker
        SIN CAMBIAR LA LÓGICA ORIGINAL de BatchImageAnalysisService
        """
        results = []
        
        logger.info(f"🚀 Iniciando procesamiento mejorado de {len(items)} items")
        
        for i, item in enumerate(items):
            try:
                # Verificar rate limiter
                if not await self.rate_limiter.can_make_request():
                    logger.warning(f"⏳ Rate limit alcanzado, esperando... (item {i+1})")
                    await asyncio.sleep(6)  # Esperar 6 segundos
                    self.processing_stats["rate_limited_requests"] += 1
                
                # Verificar circuit breaker
                if self.circuit_breaker.state == "OPEN":
                    logger.warning(f"🔴 Circuit breaker abierto, esperando... (item {i+1})")
                    await asyncio.sleep(30)  # Esperar 30 segundos
                    self.processing_stats["circuit_breaker_trips"] += 1
                
                # Usar lógica original (sin cambios)
                result = await self.analyze_image_batch([item])
                
                # Registrar request exitoso
                await self.rate_limiter.record_request()
                self.processing_stats["successful_requests"] += 1
                
                results.append(result[0] if result else {"error": "No result"})
                
                logger.info(f"✅ Item {i+1}/{len(items)} procesado exitosamente")
                
            except Exception as e:
                logger.error(f"❌ Error procesando item {i+1}: {e}")
                self.processing_stats["failed_requests"] += 1
                results.append({"error": str(e), "item_index": i})
            
            self.processing_stats["total_processed"] += 1
            
            # Pequeña pausa entre requests para evitar sobrecarga
            if i < len(items) - 1:  # No pausar después del último item
                await asyncio.sleep(0.5)
        
        logger.info(f"🎉 Procesamiento completado: {self.processing_stats}")
        return results
    
    async def process_with_adaptive_delays(self, items: List[Dict]) -> List[Dict]:
        """
        Procesa items con delays adaptativos basados en errores recientes
        """
        results = []
        base_delay = 1.0  # Delay base en segundos
        max_delay = 10.0  # Delay máximo
        
        for i, item in enumerate(items):
            try:
                # Calcular delay adaptativo
                error_rate = self.processing_stats["failed_requests"] / max(self.processing_stats["total_processed"], 1)
                adaptive_delay = min(base_delay * (1 + error_rate * 2), max_delay)
                
                if i > 0:  # No delay para el primer item
                    logger.info(f"⏱️ Delay adaptativo: {adaptive_delay:.2f}s (item {i+1})")
                    await asyncio.sleep(adaptive_delay)
                
                # Procesar con rate limiting
                result = await self.process_with_rate_limiting([item])
                results.extend(result)
                
            except Exception as e:
                logger.error(f"❌ Error en procesamiento adaptativo item {i+1}: {e}")
                results.append({"error": str(e), "item_index": i})
        
        return results
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas de procesamiento"""
        success_rate = 0
        if self.processing_stats["total_processed"] > 0:
            success_rate = (self.processing_stats["successful_requests"] / 
                          self.processing_stats["total_processed"]) * 100
        
        return {
            **self.processing_stats,
            "success_rate": success_rate,
            "rate_limiter_status": {
                "max_rpm": self.rate_limiter.max_rpm,
                "max_rpd": self.rate_limiter.max_rpd,
                "current_rpm": len(self.rate_limiter.requests_per_minute.get(
                    self._get_today_key(), []
                )),
                "current_rpd": self.rate_limiter.requests_per_day.get(
                    self._get_today_key(), 0
                )
            },
            "circuit_breaker_status": {
                "state": self.circuit_breaker.state,
                "failure_count": self.circuit_breaker.failure_count,
                "last_failure_time": self.circuit_breaker.last_failure_time
            }
        }
    
    def _get_today_key(self) -> str:
        """Obtiene la clave para el día actual"""
        import time
        return time.strftime("%Y-%m-%d")
    
    def reset_stats(self):
        """Reinicia las estadísticas"""
        self.processing_stats = {
            "total_processed": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "rate_limited_requests": 0,
            "circuit_breaker_trips": 0
        }
        logger.info("🔄 Estadísticas de procesamiento reiniciadas")

# Instancia global del servicio mejorado
enhanced_batch_service = EnhancedBatchService()
