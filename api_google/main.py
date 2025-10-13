"""
API principal para generación de videos con Veo 3.0
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn

from api.routes import health_router, video_router
from api.content_generated_routes import router as content_generated_router
from api.content_routes import content_router
from api.monitoring_routes import router as monitoring_router
from api.optimization_routes import router as optimization_router
from api.image_formats_routes import image_formats_router
from middleware.usage_monitor import UsageMonitorMiddleware
from api.rate_limiting_routes import router as rate_limiting_router
from middleware.rate_limiting import rate_limit_middleware
from models.database import create_tables
from utils.logger import setup_logger
from utils.config import get_settings
from auth.google_genai_auth import google_genai_auth

logger = setup_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    logger.info("🚀 Iniciando API de Veo 3.0")

    # Inicializar base de datos
    try:
        create_tables()
        logger.info("✅ Base de datos inicializada")
    except Exception as e:
        logger.error(f"❌ Error inicializando base de datos: {e}")

    # Inicializar autenticación de Google GenAI
    try:
        if google_genai_auth.setup_authentication():
            logger.info("✅ Google GenAI autenticación inicializada")
        else:
            logger.warning("⚠️ Google GenAI autenticación falló")
    except Exception as e:
        logger.error(f"❌ Error inicializando autenticación Google GenAI: {e}")

    yield
    logger.info("🛑 Cerrando API de Veo 3.0")

# Crear aplicación FastAPI
app = FastAPI(
    title="Google GenAI API",
    description="API para generar videos con Google Veo 3.0",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Solo orígenes específicos
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "PUT"],
    allow_headers=["*"],
)

# Crear instancia global de UsageMonitorMiddleware
usage_monitor_instance = UsageMonitorMiddleware(app)

# Agregar rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Agregar middleware de monitoreo de uso
app.add_middleware(UsageMonitorMiddleware)

# Incluir routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(video_router, prefix="/api/v1", tags=["videos"])
app.include_router(content_generated_router, tags=["content-generated"])
app.include_router(content_router)
app.include_router(monitoring_router, tags=["monitoring"])
app.include_router(optimization_router, tags=["optimization"])
app.include_router(rate_limiting_router, tags=["rate-limiting"])
app.include_router(image_formats_router)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Manejador global de excepciones"""
    logger.error(f"Error no manejado: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
