#!/bin/bash
echo "🔍 Importando tareas..."
python -c "
from tasks.image_tasks import generate_image_task, validate_image_only_task
from tasks.video_tasks_genai import *
from tasks.cleanup_tasks import *
print('✅ Todas las tareas importadas correctamente')
"

echo "🚀 Iniciando worker de Celery..."
celery -A celery_app worker --loglevel=info -Q video_generation,celery,image_processing
