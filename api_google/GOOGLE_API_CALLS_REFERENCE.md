# 📡 Google API Calls Reference

> **Documentación completa de todas las llamadas a Google APIs utilizadas en el sistema**
> **Fecha de creación**: 2025-09-28
> **Propósito**: Referencia centralizada para evitar problemas en las llamadas a API local

---

## 🎯 **RESUMEN EJECUTIVO** (Actualizado Post-Limpieza)

Este sistema utiliza **3 APIs principales de Google** (simplificado):
- **Google Veo 3.0** (Generación de videos) ✅ **ACTIVO**
- **Google Gemini 2.5 Flash Image Preview** (Procesamiento de imágenes) ✅ **ACTIVO**
- **Google Models API** (Verificación de modelos disponibles) ✅ **ACTIVO**
- ~~Google File API~~ ❌ **ELIMINADO** (reemplazado por file_manager.py local)

---

## 🎬 **1. GOOGLE VEO 3.0 API**

### **1.1 Endpoints Utilizados**

#### **Video Generation (Texto a Video)**
```
POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning
```

**Ubicación en código**:
- `tasks/video_tasks_local_only.py:223` ✅ (Activo)
- ~~`tasks/video_tasks_genai.py:220`~~ ❌ (Eliminado)

**Headers requeridos**:
```json
{
  "x-goog-api-key": "YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

**Payload estructura**:
```json
{
  "instances": [
    {
      "prompt": "string (887 chars max observado)",
      "image": {
        "bytesBase64Encoded": "string (base64)",
        "mimeType": "image/jpeg|image/png"
      }
    }
  ],
  "parameters": {
    "aspectRatio": "16:9|9:16|1:1"
  }
}
```

#### **Operation Status Check**
```
GET https://generativelanguage.googleapis.com/v1beta/{operation_name}
```

**Ubicación en código**:
- `tasks/video_tasks_local_only.py:274` ✅ (Activo)
- ~~`tasks/video_tasks_genai.py:258`~~ ❌ (Eliminado)
- `tasks/cleanup_tasks.py:30` ✅ (Activo)

---

### **1.2 Parámetros Válidos y Limitaciones**

#### **✅ Parámetros Soportados** (Confirmados por documentación oficial):
- `aspectRatio`: `"16:9"`, `"9:16"` (según docs oficiales, `"1:1"` no confirmado)
- `resolution`: `"720p"` (default), `"1080p"` (solo con 16:9)
- `prompt`: Texto descriptivo (límite oficial: 1,024 tokens)
- `negativePrompt`: Opcional (describe qué evitar)
- `image.bytesBase64Encoded`: Base64 de imagen
- `image.mimeType`: `"image/jpeg"`, `"image/png"`

#### **❌ Parámetros NO Soportados** (Causan error 400 en Gemini API):
- ~~`durationSeconds`~~ - Error: `"durationSeconds" isn't supported by this model`
  - **NOTA CRÍTICA**: ✅ SÍ soportado en Vertex AI (`aiplatform.googleapis.com`)
  - **CONFLICTO**: ❌ NO soportado en Gemini API (`generativelanguage.googleapis.com`)
- ~~`duration`~~ - Error: `"duration" isn't supported by this model`

#### **✅ Parámetros Adicionales Oficiales** (No implementados aún):
- `personGeneration`: `"allow_adult"`, `"dont_allow"`
- `seed`: `0-4294967295` (para reproducibilidad)
- `sampleCount`: `1-4` (múltiples videos)
- `enhancePrompt`: `true/false` (mejora automática de prompt)

#### **📊 Límites Oficiales** (Según documentación Google):
- **Rate Limit**: 10 requests por minuto por proyecto
- **Prompt**: 1,024 tokens máximo
- **Videos**: Almacenados solo 2 días
- **Tiempo generación**: 11 segundos a 6 minutos
- **Costo**: $0.75 por segundo de video generado
- **Watermark**: SynthID obligatorio

#### **📊 Límites Observados** (En nuestro sistema):
- **Tamaño de imagen**: Máximo 2,845,764 bytes observados
- **Payload total**: Máximo 2,846,800 bytes
- **Timeout**: 60 segundos para generación, 300 segundos para descarga

---

### **1.3 Códigos de Error Comunes**

#### **429 - RESOURCE_EXHAUSTED**
```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details.",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```
**Solución**: Verificar cuota en Google Cloud Console

#### **400 - INVALID_ARGUMENT**
```json
{
  "error": {
    "code": 400,
    "message": "`durationSeconds` isn't supported by this model.",
    "status": "INVALID_ARGUMENT"
  }
}
```
**Solución**: Eliminar parámetros no soportados del payload

---

## 🖼️ **2. GOOGLE GEMINI 2.5 FLASH IMAGE PREVIEW API**

### **2.1 Endpoint**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent
```

**Ubicación en código**: `api/routes.py:332`

### **2.2 Payload Estructura**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "enhanced_prompt"
        },
        {
          "inlineData": {
            "mimeType": "image/jpeg|image/png",
            "data": "base64_clean_data"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2048
  }
}
```

### **2.3 Configuración**
- **Temperature**: `0.7` (hardcodeado)
- **Max Output Tokens**: `2048` (hardcodeado)
- **Timeout**: `30` segundos

---

## ~~📁 **3. GOOGLE FILE API**~~ ❌ **ELIMINADO**

### **⚠️ REEMPLAZADO POR GESTIÓN LOCAL**

El Google File API fue **completamente eliminado** del sistema y reemplazado por:

- **✅ `utils/file_manager.py`**: Gestión local de archivos
- **✅ Base64 directo**: Envío de imágenes sin File API
- **✅ Storage local**: `uploads/banana/video/` y `uploads/videos/clip/`

**Beneficios de la eliminación**:
- 🚀 **Más rápido**: Sin upload/download de Google
- 🔒 **Más privado**: Archivos locales
- 💰 **Más barato**: Sin costos de storage de Google
- 🛠️ **Más simple**: Menos APIs que manejar

---

## 🔍 **4. GOOGLE MODELS API**

### **4.1 Endpoint**
```
GET https://generativelanguage.googleapis.com/v1beta/models
```

**Ubicación**: `services/quota_service.py:65`

**Propósito**: Verificar modelos disponibles y acceso a Veo

---

## 🔧 **5. CONFIGURACIÓN Y AUTENTICACIÓN**

### **5.1 Variables de Entorno**
```bash
# Actual en uso (Backup 2)
GOOGLE_API_KEY=AIzaSyAT4axAnh-vHzNDg42tQophhQaErR-GvVM

# Claves comentadas (respaldo)
#GOOGLE_API_KEY=AIzaSyDRUCSNdIQ1tuUcnhMklt6zrrMaeRR6V8w  # Principal
#GOOGLE_API_KEY=AIzaSyD8DB6XuysqVkXEZEAJyUqeGPu9b2IuRgg   # Backup 1
#GOOGLE_API_KEY=AIzaSyAbgM0K5JAYBEhgR1U_SBHHmCNeXwJfFas   # Backup 3
```

### **5.2 Rate Limiting (Sistema)**
```bash
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60  # segundos
```

### **5.3 Circuit Breaker**
**Configuración**: `services/circuit_breaker.py`
- **Failure threshold**: Configurable
- **Timeout**: Configurable
- **Estado actual**: Monitoreado en `/health` endpoint

---

## 📈 **6. MONITOREO Y LOGGING**

### **6.1 API Call Logs**
**Ubicación**: `uploads/api_logs/`

**Formato**: `api_call_{operation_id}_{timestamp}.json`

**Estructura de log**:
```json
{
  "timestamp": "2025-09-28T05:49:27.520968",
  "operation_id": "uuid",
  "api_call": {
    "url": "string",
    "method": "POST|GET|DELETE",
    "headers": {"x-goog-api-key": "***masked"},
    "payload_size_bytes": 2846800,
    "payload_structure": {
      "instances_count": 1,
      "prompt_length": 887,
      "has_image": true,
      "image_size_bytes": 2845764,
      "parameters": {"aspectRatio": "16:9"}
    }
  },
  "error": {
    "type": "Exception",
    "message": "Error details"
  }
}
```

### **6.2 Health Check**
**Endpoint**: `GET /health`

**Información incluida**:
- Estado de autenticación Google GenAI
- Estado del circuit breaker
- Información de cuota
- Estado de servicios

---

## 🚨 **7. ERRORES COMUNES Y SOLUCIONES**

### **7.1 Error de Cuota Excedida**
**Error**: `429 RESOURCE_EXHAUSTED`
**Causa**: Límites de API alcanzados
**Solución**:
1. Verificar cuota en Google Cloud Console
2. Implementar retry con backoff exponencial
3. Activar circuit breaker

### **7.2 Parámetros No Soportados**
**Error**: `400 INVALID_ARGUMENT`
**Causa**: Uso de parámetros obsoletos (`durationSeconds`, `duration`)
**Solución**: Eliminar parámetros del payload

### **7.3 Imagen Demasiado Grande**
**Error**: Posible timeout o error de payload
**Causa**: Imagen > 3MB aproximadamente
**Solución**: Redimensionar imagen antes del envío

### **7.4 Circuit Breaker Abierto**
**Error**: `Circuit breaker OPEN - Google Veo API no disponible`
**Causa**: Múltiples fallos consecutivos
**Solución**: Esperar timeout o reiniciar manualmente

---

## 🔄 **8. MODELOS DISPONIBLES Y APIS**

### **8.1 Modelos Veo (Gemini API - Nuestro endpoint actual)**
- ✅ **veo-3.0-generate-preview** (En uso actual - Calidad alta)
- 🟡 **veo-3.0-fast-generate-001** (Disponible - Velocidad alta)
- **Endpoint**: `generativelanguage.googleapis.com/v1beta/models/`
- **Limitación**: NO soporta `durationSeconds`

### **8.2 Modelos Veo (Vertex AI - Alternativa)**
- ✅ **veo-3.0-generate-preview** (Soporta `durationSeconds`)
- **Endpoint**: `aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/`
- **Ventaja**: Parámetros adicionales (duration, compressionQuality)

### **8.3 Modelos Gemini**
- ✅ **gemini-2.5-flash-image-preview** (En uso para imágenes)

---

## 📋 **9. CHECKLIST DE VALIDACIÓN**

### **Antes de hacer llamadas API**:
- [ ] Verificar `GOOGLE_API_KEY` válida
- [ ] Validar formato de parámetros
- [ ] Verificar tamaño de imagen < 3MB
- [ ] Comprobar estado del circuit breaker
- [ ] Verificar cuota disponible

### **Después de error**:
- [ ] Revisar logs en `uploads/api_logs/`
- [ ] Verificar código de error HTTP
- [ ] Comprobar mensaje de error específico
- [ ] Actualizar circuit breaker si es necesario

---

## 🔗 **10. RECURSOS ÚTILES**

- **Documentación Oficial**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Cuotas y Límites**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Solicitar Acceso Veo**: [Formulario oficial de Google]
- **Health Check Local**: http://localhost:8001/health

---

## ⚡ **11. ARQUITECTURA SIMPLIFICADA ACTUAL**

### **🎯 Estado Actual del Sistema** (Post-Limpieza):
- ✅ **Solo Gemini API** (`generativelanguage.googleapis.com`)
- ✅ **Autenticación simple** (solo GOOGLE_API_KEY)
- ✅ **23 archivos Python** (reducido de 27)
- ✅ **Sin SDKs complejos** ni dependencias Vertex AI

### **📁 Estructura de Archivos Actualizada**:
```
api_google/
├── api/routes.py              # ✅ Rutas principales + file serving
├── auth/google_genai_auth.py  # ✅ Simplificado (38 líneas)
├── services/
│   ├── veo_service.py         # ✅ Solo Gemini API
│   ├── circuit_breaker.py     # ✅ Mantenido
│   └── quota_service.py       # ✅ Mantenido
├── tasks/
│   ├── video_tasks_local_only.py # ✅ Principal (HTTP directo)
│   └── cleanup_tasks.py       # ✅ Mantenido
├── utils/
│   ├── file_manager.py        # ✅ Gestión archivos local
│   └── config.py              # ✅ Simplificado
└── models/ schemas/ middleware/ # ✅ Sin cambios
```

### **🔧 Cambio a Veo 3.0 Fast**:
1. Editar `tasks/video_tasks_local_only.py:223`
2. Cambiar URL:
   ```python
   # Actual (Preview - Calidad alta)
   url = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning"

   # Cambiar a (Fast - Velocidad alta)
   url = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning"
   ```
3. Recompilar: `./build.sh`

### **📋 Configuración Simplificada**:
```bash
# .env (Solo necesario)
GOOGLE_API_KEY=AIzaSyAT4axAnh-vHzNDg42tQophhQaErR-GvVM

# Variables eliminadas (ya no necesarias):
# GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_REGION,
# GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS
```

### **⚠️ Nota sobre Vertex AI**:
**Vertex AI fue completamente eliminado** del proyecto para simplificar la arquitectura.
Si necesitas `durationSeconds` en el futuro, requeriría:
1. Reimplementar autenticación service account
2. Cambiar a endpoints `aiplatform.googleapis.com`
3. Modificar estructura de payload

---

---

## 📋 **12. CHANGELOG - SIMPLIFICACIÓN ARQUITECTURA**

### **📅 2025-09-28 - Limpieza Completa**:

#### **🗑️ Archivos Eliminados**:
- ❌ `auth/google_auth.py` (Vertex AI auth)
- ❌ `tasks/video_tasks_genai.py` (GenAI SDK)
- ❌ `services/file_storage_service.py` (600+ líneas no usadas)
- ❌ `api/file_routes.py` (rutas duplicadas)
- ❌ `services/redis_service.py` (wrapper no usado)
- ❌ `scripts/check_veo_access.py` (diagnóstico Vertex AI)
- ❌ `.env.example` (configuración Vertex AI)

#### **♻️ Archivos Simplificados**:
- ✅ `auth/google_genai_auth.py`: 80+ → 38 líneas
- ✅ `utils/config.py`: Removidas variables Vertex AI
- ✅ `services/veo_service.py`: Solo Gemini API

#### **📊 Resultados**:
- **Archivos**: 27 → 23 (-15%)
- **Complejidad**: Reducida significativamente
- **Dependencias**: Solo Gemini API
- **Mantenimiento**: Más simple y claro

---

**🔄 Última actualización**: 2025-09-28 (Post-Limpieza)
**📝 Generado por**: Claude Code - Sistema de Análisis de APIs
**🎯 Contexto**: API local simplificada - Solo Gemini API
**📁 Estado**: 23 archivos Python, arquitectura limpia
