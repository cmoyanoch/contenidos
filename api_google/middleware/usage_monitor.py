"""
Middleware para monitorear uso real de la API de Google
"""
import time
import asyncio
from typing import Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from utils.logger import setup_logger

logger = setup_logger(__name__)

class UsageMonitorMiddleware(BaseHTTPMiddleware):
    """Middleware para monitorear requests y detectar límites reales"""
    
    def __init__(self, app):
        super().__init__(app)
        self.request_history = []
        self.error_history = []
        self.limit_detection = {
            "suspected_rpm": None,
            "suspected_rpd": None,
            "last_429_time": None,
            "last_403_time": None
        }
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Procesar request
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # Registrar cada request
        self.request_history.append({
            "timestamp": time.time(),
            "method": request.method,
            "url": str(request.url),
            "status_code": response.status_code,
            "process_time_ms": process_time * 1000
        })
        
        # Mantener historial limitado
        self.request_history = self.request_history[-1000:]
        
        # Detectar errores de rate limiting o cuota
        if response.status_code == 429:
            self.limit_detection["last_429_time"] = time.time()
            self.error_history.append({
                "timestamp": time.time(),
                "status_code": 429,
                "message": "Rate limit excedido"
            })
            logger.warning(f"⚠️ Rate limit (429) detectado en {request.url}")
        elif response.status_code == 403:
            self.limit_detection["last_403_time"] = time.time()
            self.error_history.append({
                "timestamp": time.time(),
                "status_code": 403,
                "message": "Cuota excedida o permiso denegado"
            })
            logger.error(f"❌ Cuota excedida (403) detectada en {request.url}")
        
        self.error_history = self.error_history[-500:]
        
        return response
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas de uso"""
        now = time.time()
        last_hour = now - 3600

        recent_requests = [req for req in self.request_history if req["timestamp"] > last_hour]
        recent_errors = [err for err in self.error_history if err["timestamp"] > last_hour]

        total_requests = len(recent_requests)
        total_errors = len(recent_errors)
        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0

        return {
            "total_requests_last_hour": total_requests,
            "total_errors_last_hour": total_errors,
            "error_rate": error_rate,
            "rate_limit_errors": len([err for err in recent_errors if err["status_code"] == 429]),
            "quota_errors": len([err for err in recent_errors if err["status_code"] == 403]),
            "avg_response_time_ms": sum(req["process_time_ms"] for req in recent_requests) / len(recent_requests) if recent_requests else 0,
            "last_429_time": self.limit_detection["last_429_time"],
            "last_403_time": self.limit_detection["last_403_time"]
        }
