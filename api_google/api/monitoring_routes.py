"""
Router de monitoreo - SOLO LECTURA
"""
from fastapi import APIRouter, HTTPException, Depends

from sqlalchemy import text
from sqlalchemy.orm import Session
from models.database import get_database_engine, get_database_session
from datetime import datetime
import json

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = get_database_session()
    try:
        yield db
    finally:
        db.close()

@router.get("/dashboard")
async def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Dashboard de métricas - SOLO LECTURA"""

    try:
        # 1. Métricas de uso por hora (últimas 24h)
        usage_query = text("""
            SELECT
                DATE_TRUNC('hour', request_timestamp) as hour,
                COUNT(*) as calls_per_hour,
                AVG(duration_ms) as avg_duration_ms,
                COUNT(CASE WHEN response_status_code >= 400 THEN 1 END) as error_count
            FROM api_google.google_api_calls
            WHERE request_timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT 24;
        """)

        # 2. Métricas de errores (últimos 7 días)
        errors_query = text("""
            SELECT
                response_status_code,
                COUNT(*) as count,
                endpoint
            FROM api_google.google_api_calls
            WHERE request_timestamp >= NOW() - INTERVAL '7 days'
            AND response_status_code >= 400
            GROUP BY response_status_code, endpoint
            ORDER BY count DESC;
        """)

        # 3. Métricas de video operations (últimos 7 días)
        video_query = text("""
            SELECT
                status,
                COUNT(*) as count,
                AVG(duration) as avg_duration
            FROM api_google.video_operations
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY status;
        """)

        # 4. Resumen general
        summary_query = text("""
            SELECT
                COUNT(*) as total_calls_24h,
                AVG(duration_ms) as avg_duration_ms,
                COUNT(CASE WHEN response_status_code >= 400 THEN 1 END) as total_errors,
                COUNT(CASE WHEN response_status_code = 429 THEN 1 END) as rate_limit_errors,
                COUNT(CASE WHEN response_status_code = 403 THEN 1 END) as quota_errors
            FROM api_google.google_api_calls
            WHERE request_timestamp >= NOW() - INTERVAL '24 hours';
        """)

        # Ejecutar consultas (solo lectura)
        usage_data = db.execute(usage_query).fetchall()
        errors_data = db.execute(errors_query).fetchall()
        video_data = db.execute(video_query).fetchall()
        summary_data = db.execute(summary_query).fetchone()

        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_calls_24h": summary_data[0] if summary_data else 0,
                "avg_duration_ms": float(summary_data[1]) if summary_data and summary_data[1] else 0,
                "total_errors": summary_data[2] if summary_data else 0,
                "rate_limit_errors": summary_data[3] if summary_data else 0,
                "quota_errors": summary_data[4] if summary_data else 0
            },
            "usage_metrics": [
                {
                    "hour": row[0].isoformat() if row[0] else None,
                    "calls_per_hour": row[1],
                    "avg_duration_ms": float(row[2]) if row[2] else 0,
                    "error_count": row[3]
                } for row in usage_data
            ],
            "error_metrics": [
                {
                    "status_code": row[0],
                    "count": row[1],
                    "endpoint": row[2]
                } for row in errors_data
            ],
            "video_metrics": [
                {
                    "status": row[0],
                    "count": row[1],
                    "avg_duration": float(row[2]) if row[2] else 0
                } for row in video_data
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")

@router.get("/rate-limits")
async def get_rate_limit_analysis(db: Session = Depends(get_db)):
    """Análisis de rate limits - SOLO LECTURA"""

    try:
        # Detectar patrones de rate limiting
        query = text("""
            SELECT
                endpoint,
                COUNT(*) as total_calls,
                COUNT(CASE WHEN response_status_code = 429 THEN 1 END) as rate_limit_errors,
                COUNT(CASE WHEN response_status_code = 403 THEN 1 END) as quota_errors,
                AVG(duration_ms) as avg_duration_ms,
                MAX(request_timestamp) as last_call
            FROM api_google.google_api_calls
            WHERE request_timestamp >= NOW() - INTERVAL '7 days'
            GROUP BY endpoint
            ORDER BY total_calls DESC;
        """)

        data = db.execute(query).fetchall()

        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "rate_limit_analysis": [
                {
                    "endpoint": row[0],
                    "total_calls": row[1],
                    "rate_limit_errors": row[2],
                    "quota_errors": row[3],
                    "avg_duration_ms": float(row[4]) if row[4] else 0,
                    "last_call": row[5].isoformat() if row[5] else None
                } for row in data
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")

@router.get("/health")
async def get_health_status():
    """Estado de salud del sistema - SOLO LECTURA"""

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected",
            "monitoring": "active"
        }
    }
