"""
API principal para generación de videos con Veo 3.0
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path

from api.routes import health_router, video_router
from api.content_generated_routes import router as content_generated_router
from api.content_routes import content_router
from api.monitoring_routes import router as monitoring_router
from api.optimization_routes import router as optimization_router
from api.image_formats_routes import image_formats_router
from api.staff_routes import router as staff_router
from api.branding_routes import router as branding_router
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
settings = get_settings()

# ✅ CORS configurado desde variables de entorno
cors_origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else []
cors_methods = settings.CORS_ALLOW_METHODS.split(",") if settings.CORS_ALLOW_METHODS else ["GET", "POST"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=cors_methods,
    allow_headers=[settings.CORS_ALLOW_HEADERS] if settings.CORS_ALLOW_HEADERS != "*" else ["*"],
)

# Crear instancia global de UsageMonitorMiddleware
usage_monitor_instance = UsageMonitorMiddleware(app)

# Agregar rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Agregar middleware de monitoreo de uso
app.add_middleware(UsageMonitorMiddleware)

# Endpoint para servir iconos de branding (DEBE estar ANTES del endpoint genérico)
@app.get("/uploads/icons/{icon_path:path}")
async def serve_icons(icon_path: str):
    """Servir iconos desde /app/uploads/icons/"""
    try:
        file_path = Path(f"/app/uploads/icons/{icon_path}")

        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Icon not found: {icon_path}")

        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Determinar media type basado en extensión
        media_type = "image/png"  # default
        if icon_path.endswith('.jpg') or icon_path.endswith('.jpeg'):
            media_type = "image/jpeg"
        elif icon_path.endswith('.gif'):
            media_type = "image/gif"
        elif icon_path.endswith('.svg'):
            media_type = "image/svg+xml"

        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=file_path.name
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving icon: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving icon: {str(e)}")

# Endpoint para servir imágenes del staff (genérico, debe estar DESPUÉS de endpoints específicos)
@app.get("/uploads/{image_path:path}")
async def serve_images(image_path: str):
    """Servir imágenes desde /app/uploads/banana/"""
    try:
        file_path = Path(f"/app/uploads/banana/{image_path}")

        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Image not found: {image_path}")

        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")

        return FileResponse(
            path=str(file_path),
            media_type="image/png",
            filename=file_path.name
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving image: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")

# Incluir routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(video_router, prefix="/api/v1", tags=["videos"])
app.include_router(content_generated_router, tags=["content-generated"])
app.include_router(content_router)
app.include_router(monitoring_router, tags=["monitoring"])
app.include_router(optimization_router, tags=["optimization"])
app.include_router(rate_limiting_router, tags=["rate-limiting"])
app.include_router(image_formats_router)
app.include_router(staff_router, tags=["staff"])
app.include_router(branding_router, tags=["branding"])

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
