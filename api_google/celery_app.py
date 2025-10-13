"""
Configuración de Celery para tareas asíncronas
"""
from celery import Celery
from utils.config import get_settings

settings = get_settings()

# Crear instancia de Celery
celery_app = Celery(
    "veo_video_generation",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        'tasks.video_tasks_local_only',
        'tasks.cleanup_tasks'
    ]
)

# Configuración de Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutos máximo por tarea
    task_soft_time_limit=25 * 60,  # 25 minutos límite suave
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    task_routes={
        'tasks.video_tasks_local_only.*': {'queue': 'video_generation'},
        'tasks.cleanup_tasks.*': {'queue': 'celery'},
    },
    # Schedule automático para cleanup y mantenimiento
    beat_schedule={
        'cleanup-stuck-operations': {
            'task': 'tasks.cleanup_tasks.cleanup_stuck_operations',
            'schedule': 300.0,  # cada 5 minutos
        },
        'cleanup-old-errors': {
            'task': 'tasks.cleanup_tasks.cleanup_old_error_operations',
            'schedule': 3600.0,  # cada 1 hora
        },
        'cleanup-old-api-calls': {
            'task': 'tasks.cleanup_tasks.cleanup_old_google_api_calls',
            'schedule': 86400.0,  # cada 24 horas
        },
        'requeue-stuck-queued': {
            'task': 'tasks.cleanup_tasks.requeue_stuck_queued_operations',
            'schedule': 600.0,  # cada 10 minutos
        },
        'health-check-operations': {
            'task': 'tasks.cleanup_tasks.health_check_operations',
            'schedule': 900.0,  # cada 15 minutos
        },
    },
    task_default_queue='video_generation',
    task_always_eager=False,
    task_eager_propagates=True,
    result_expires=3600,  # 1 hora
    result_persistent=True,
    worker_disable_rate_limits=False,
    worker_hijack_root_logger=False,
    worker_log_color=False,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
)

# Configuración de logging
import logging
logging.basicConfig(level=logging.INFO)
