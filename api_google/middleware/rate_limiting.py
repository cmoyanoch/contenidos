"""
Rate limiting middleware para la API
"""
import time
import json
from typing import Dict
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import redis

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class RateLimiter:
    """Rate limiter usando Redis"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis_client = redis.from_url(self.settings.REDIS_URL)
        
    def is_allowed(self, key: str, limit: int, window: int) -> Dict[str, any]:
        """
        Verifica si la request está dentro del límite
        Returns: {'allowed': bool, 'remaining': int, 'reset_time': int}
        """
        current_time = int(time.time())
        pipe = self.redis_client.pipeline()
        
        # Usar sliding window con Redis
        pipe.zremrangebyscore(key, 0, current_time - window)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window)
        
        results = pipe.execute()
        current_requests = results[1]
        
        if current_requests >= limit:
            return {
                'allowed': False,
                'remaining': 0,
                'reset_time': current_time + window
            }
        
        return {
            'allowed': True,
            'remaining': limit - current_requests - 1,
            'reset_time': current_time + window
        }

# Instancia global
rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    """Middleware de rate limiting"""
    
    # Obtener IP del cliente
    client_ip = request.client.host
    
    # Diferentes límites por endpoint
    path = request.url.path
    
    if "/generate/" in path:
        # Límite temporal para pruebas - SOLO PARA TESTING
        limit = 20  # 20 requests por hora (temporal)
        window = 3600  # 1 hora
        key = f"rate_limit:generate:{client_ip}"
    elif "/status/" in path or "/download/" in path:
        # Límite más permisivo para status/download
        limit = 60  # 60 requests por minuto
        window = 60  # 1 minuto
        key = f"rate_limit:status:{client_ip}"
    else:
        # Límite general
        limit = 30  # 30 requests por minuto
        window = 60
        key = f"rate_limit:general:{client_ip}"
    
    try:
        result = rate_limiter.is_allowed(key, limit, window)
        
        if not result['allowed']:
            logger.warning(f"Rate limit excedido para {client_ip} en {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit excedido",
                    "limit": limit,
                    "window": window,
                    "reset_time": result['reset_time']
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": str(result['remaining']),
                    "X-RateLimit-Reset": str(result['reset_time'])
                }
            )
        
        # Agregar headers de rate limiting
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(result['remaining'])
        response.headers["X-RateLimit-Reset"] = str(result['reset_time'])
        
        return response
        
    except Exception as e:
        logger.error(f"Error en rate limiting: {e}")
        # En caso de error, permitir la request
        return await call_next(request)