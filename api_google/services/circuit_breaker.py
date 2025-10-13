"""
Circuit Breaker para Google Veo API
"""
import time
import asyncio
from enum import Enum
from typing import Callable, Any, Optional
from dataclasses import dataclass

from utils.logger import setup_logger

logger = setup_logger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open" 
    HALF_OPEN = "half_open"

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    recovery_timeout: int = 60  # segundos
    expected_exception: Optional[type] = Exception

class CircuitBreaker:
    """Circuit breaker para proteger llamadas a APIs externas"""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        
    def __call__(self, func: Callable) -> Callable:
        """Decorator para aplicar circuit breaker"""
        async def wrapper(*args, **kwargs):
            return await self.call(func, *args, **kwargs)
        return wrapper
        
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Ejecutar función con circuit breaker"""
        
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info("🔄 Circuit breaker en estado HALF_OPEN")
            else:
                raise Exception(f"Circuit breaker OPEN - Google Veo API no disponible")
                
        try:
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            self._on_success()
            return result
            
        except Exception as e:
            self._on_failure()

            error_msg = str(e).lower()

            # Re-raise excepciones específicas de Google API
            if "quota" in error_msg or "rate limit" in error_msg or "429" in error_msg:
                logger.error(f"🚫 Google API quota/rate limit: {e}")
                raise Exception(f"Google API quota excedida: {e}")
            elif "503" in error_msg or "service unavailable" in error_msg:
                logger.error(f"⚠️ Google API servicio no disponible (503): {e}")
                raise Exception(f"Google API temporalmente no disponible - reintentando...")
            elif "502" in error_msg or "bad gateway" in error_msg:
                logger.error(f"⚠️ Google API bad gateway (502): {e}")
                raise Exception(f"Google API gateway error - reintentando...")
            elif "authentication" in error_msg or "unauthorized" in error_msg or "401" in error_msg:
                logger.error(f"🔑 Error de autenticación Google API: {e}")
                raise Exception(f"Error autenticación Google API: {e}")
            else:
                raise e
                
    def _should_attempt_reset(self) -> bool:
        """Verifica si debería intentar reset del circuit breaker"""
        return (
            self.last_failure_time is not None and
            time.time() - self.last_failure_time >= self.config.recovery_timeout
        )
        
    def _on_success(self):
        """Callback en caso de éxito"""
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        
    def _on_failure(self):
        """Callback en caso de fallo"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"🔴 Circuit breaker OPEN después de {self.failure_count} fallos")
            
    def get_state(self) -> dict:
        """Obtener estado actual del circuit breaker"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
            "is_available": self.state == CircuitState.CLOSED
        }

# Instancias globales para diferentes servicios
veo_circuit_breaker = CircuitBreaker(CircuitBreakerConfig(
    failure_threshold=3,
    recovery_timeout=300,  # 5 minutos
    expected_exception=Exception
))