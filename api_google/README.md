# 🎬 Google Veo 3.0 Video Generation API

> API profesional para generación de videos usando Google Veo 3.0 con manejo avanzado de errores, rate limiting y circuit breakers.

## 📋 Descripción

Esta API permite generar videos a partir de texto o imágenes utilizando el modelo Google Veo 3.0. Incluye funcionalidades avanzadas como:

- ✨ Generación de video desde texto (Text-to-Video)
- 🖼️ Generación de video desde imagen (Image-to-Video)
- 🔒 Rate limiting y manejo de cuotas
- 🛡️ Circuit breakers para resiliencia
- 📊 Monitoreo con Celery y Flower
- 🗄️ Persistencia en PostgreSQL
- ⚡ Cache con Redis
- 📝 Logging avanzado

## 🛠️ Stack Tecnológico

- **Backend**: FastAPI + Python 3.11
- **Base de datos**: PostgreSQL 15
- **Cache**: Redis 7
- **Queue**: Celery + Redis
- **Monitoreo**: Flower
- **Containerización**: Docker + Docker Compose
- **AI/ML**: Google GenAI SDK

## 📁 Estructura del Proyecto

```
api_google/
├── main.py                 # Punto de entrada de la API
├── celery_app.py           # Configuración de Celery
├── requirements.txt        # Dependencias Python
├── Dockerfile             # Configuración del contenedor
├── init-db.sh             # Script de inicialización de base de datos
├── .env                   # Variables de entorno (configuración)
├── .env.example           # Ejemplo de configuración
├── .env.production        # Configuración de producción
├── api/                   # Endpoints y rutas
├── auth/                  # Autenticación con Google
├── models/                # Modelos de datos y base de datos
├── services/              # Lógica de negocio
├── tasks/                 # Tareas asíncronas de Celery
├── middleware/            # Rate limiting y middlewares
├── utils/                 # Utilidades y configuración
├── scripts/               # Scripts de utilidad
└── uploads/              # Archivos subidos
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Clave API de Google (GOOGLE_API_KEY)

### Instalación

1. **Configurar variables de entorno**:
```bash
# Dentro de la carpeta api_google/
cd api_google/

# Copiar archivo de configuración
cp .env.example .env

# Editar .env y agregar tu GOOGLE_API_KEY
nano .env
```

2. **Construir y ejecutar con Docker**:
```bash
# Desde el directorio raíz del proyecto
docker-compose up --build

# O usar el script automatizado
./build-and-clean.sh
```

3. **Verificar funcionamiento**:
```bash
# Health check
curl http://localhost:8001/health/

# Debería responder: {"status": "healthy"}
```

## 🔌 Endpoints de la API

### Health Check
```http
GET /health/
```

### Generación de Video desde Texto
```http
POST /api/generate-video/
Content-Type: application/json

{
  "prompt": "Un gato jugando en el jardín",
  "aspect_ratio": "16:9",
  "duration_seconds": 5
}
```

### Generación de Video desde Imagen
```http
POST /api/generate-video-from-image/
Content-Type: multipart/form-data

prompt: "El personaje de la imagen caminando"
image: [archivo de imagen]
aspect_ratio: "16:9"
duration_seconds: 5
```

### Consultar Estado de Video
```http
GET /api/video-status/{video_id}
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Clave API de Google GenAI | `AIza...` |
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://user:pass@host:port/db` |
| `REDIS_URL` | URL de Redis | `redis://host:port/db` |

### Configuración de Rate Limiting

```python
# En utils/config.py
RATE_LIMIT_REQUESTS = 100  # Requests por ventana
RATE_LIMIT_WINDOW = 3600   # Ventana en segundos (1 hora)
```

## 📊 Monitoreo

### Servicios Disponibles

- **API**: http://localhost:8001
- **Flower (Celery Monitor)**: http://localhost:5556
- **N8N Workflows**: http://localhost:5678

### Logs

Los logs se almacenan en `/app/logs/` dentro del contenedor y son accesibles en el host.

## 🧪 Testing

```bash
# Ejecutar tests (si están configurados)
python -m pytest tests/

# Verificar sintaxis
python -m py_compile main.py
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de autenticación con Google**:
   - Verificar que `GOOGLE_API_KEY` esté configurada correctamente
   - Ejecutar: `python scripts/check_veo_access.py`

2. **Base de datos no conecta**:
   - Verificar que PostgreSQL esté corriendo
   - Comprobar `DATABASE_URL` en `.env`

3. **Redis no disponible**:
   - Verificar que Redis esté corriendo
   - Comprobar `REDIS_URL` en `.env`

### Comandos de Diagnóstico

```bash
# Ver logs de la API
docker-compose logs api

# Ver logs de Celery worker
docker-compose logs worker

# Verificar estado de contenedores
docker-compose ps

# Limpiar y reconstruir
./clean-docker.sh
./build-and-clean.sh
```

## 🔄 Desarrollo

### Estructura de Desarrollo

```bash
# Activar modo desarrollo (auto-reload)
docker-compose up --build

# Ejecutar comandos dentro del contenedor
docker-compose exec api bash

# Ver logs en tiempo real
docker-compose logs -f api
```

### Agregar Nuevas Funcionalidades

1. **Nuevos endpoints**: Agregar en `api/routes.py`
2. **Nuevos modelos**: Agregar en `models/schemas.py`
3. **Nuevos servicios**: Agregar en `services/`
4. **Nuevas tareas async**: Agregar en `tasks/`

## 📚 Documentación Adicional

- **Documentación completa**: Ver `../PROJECT_DOCUMENTATION.md`
- **API Docs**: http://localhost:8001/docs (cuando esté corriendo)
- **ReDoc**: http://localhost:8001/redoc

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear un issue en el repositorio
- Revisar la documentación completa
- Verificar logs de la aplicación

---

*Desarrollado con ❤️ usando FastAPI y Google Veo 3.0*




NEXT_PUBLIC_API_RRSS_URL=https://api-rrss.srv1004950.hstgr.cloud


# N8N
NEXT_PUBLIC_N8N_URL=http://n8n:5678
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://n8n:5678/webhook


# Configuración del Frontend para producción
NODE_ENV=production

# URLs de APIs (usando nombres de contenedores Docker)
NEXT_PUBLIC_API_URL=http://api_google:8000
NEXT_PUBLIC_API_RRSS_URL=http://api_rrss:8002

# URLs de servicios (usando nombres de contenedores Docker)
NEXT_PUBLIC_N8N_URL=http://n8n:5678
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://n8n:5678/webhook
NEXT_PUBLIC_PGADMIN_URL=http://pgadmin:80
NEXT_PUBLIC_FLOWER_URL=http://flower:5555

# URLs de archivos
NEXT_PUBLIC_UPLOADS_URL=http://api_google:8000/uploads
NEXT_PUBLIC_ICONS_URL=http://api_google:8000/uploads/icons

# Base de datos
DATABASE_URL=postgresql://postgres:password@db:5432/frontend_db

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://n8n.srv1004950.hstgr.cloud

# Configuración de archivos
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

NEXT_PUBLIC_API_RRSS_URL=https://api-rrss.srv1004950.hstgr.cloud


# N8N
NEXT_PUBLIC_N8N_URL=http://n8n:5678
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://n8n:5678/webhook



# Configuración del Frontend para producción
NODE_ENV=production

# URLs de APIs (usando nombres de contenedores Docker)
NEXT_PUBLIC_API_URL=http://api_google:8000
NEXT_PUBLIC_API_RRSS_URL=http://api_rrss:8002

# URLs de servicios (usando nombres de contenedores Docker)
NEXT_PUBLIC_N8N_URL=http://n8n:5678
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://n8n:5678/webhook
NEXT_PUBLIC_PGADMIN_URL=http://pgadmin:80
NEXT_PUBLIC_FLOWER_URL=http://flower:5555

# URLs de archivos
NEXT_PUBLIC_UPLOADS_URL=http://api_google:8000/uploads
NEXT_PUBLIC_ICONS_URL=http://api_google:8000/uploads/icons

# Base de datos
DATABASE_URL=postgresql://postgres:password@db:5432/frontend_db

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://n8n.srv1004950.hstgr.cloud

# Configuración de archivos
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
