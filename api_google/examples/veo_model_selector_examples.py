#!/usr/bin/env python3
"""
Ejemplos de uso del selector de modelo Veo 3.0

Demuestra cómo usar los diferentes modelos disponibles:
- veo-3.0-generate-preview (calidad alta, más lento)
- veo-3.0-fast-generate-001 (velocidad alta, calidad buena)
"""
import requests
import json
import base64
from pathlib import Path

# Configuración
API_BASE_URL = "http://localhost:8001/api/v1"

def example_text_to_video_preview():
    """Ejemplo usando Veo 3.0 Preview (calidad alta)"""

    payload = {
        "prompt": "A majestic eagle soaring through snow-capped mountains at sunset",
        "aspect_ratio": "16:9",
        "resolution": "720p",
        "veo_model": "veo-3.0-generate-preview",  # Calidad alta
        "negative_prompt": "blurry, low quality"
    }

    response = requests.post(f"{API_BASE_URL}/generate/text-to-video", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("✅ Video con Veo Preview iniciado:")
        print(f"Operation ID: {result['operation_id']}")
        print("📊 Características:")
        print("  - Modelo: veo-3.0-generate-preview")
        print("  - Calidad: Alta")
        print("  - Velocidad: Más lenta")
        print("  - Ideal para: Contenido final, producciones")
        return result['operation_id']
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def example_text_to_video_fast():
    """Ejemplo usando Veo 3.0 Fast (velocidad alta)"""

    payload = {
        "prompt": "A cat playing with a ball of yarn in a cozy living room",
        "aspect_ratio": "16:9",
        "resolution": "720p",
        "veo_model": "veo-3.0-fast-generate-001",  # Velocidad alta
        "negative_prompt": "dark, scary"
    }

    response = requests.post(f"{API_BASE_URL}/generate/text-to-video", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("🚀 Video con Veo Fast iniciado:")
        print(f"Operation ID: {result['operation_id']}")
        print("📊 Características:")
        print("  - Modelo: veo-3.0-fast-generate-001")
        print("  - Calidad: Buena")
        print("  - Velocidad: Rápida")
        print("  - Ideal para: Prototipos, pruebas rápidas")
        return result['operation_id']
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def example_image_to_video_comparison():
    """Comparación lado a lado de ambos modelos"""

    # Imagen base64 de ejemplo (1x1 pixel transparente)
    sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    # Request base
    base_payload = {
        "prompt": "Transform this into a vibrant animated scene with flowing water and gentle breeze",
        "image_base64": sample_image,
        "content_type": "image/png",
        "aspect_ratio": "16:9",
        "resolution": "720p"
    }

    # Test con Preview
    payload_preview = {**base_payload, "veo_model": "veo-3.0-generate-preview"}

    # Test con Fast
    payload_fast = {**base_payload, "veo_model": "veo-3.0-fast-generate-001"}

    print("🎬 Iniciando comparación de modelos...")

    # Enviar ambos requests
    response_preview = requests.post(f"{API_BASE_URL}/generate/image-to-video-base64-json", json=payload_preview)
    response_fast = requests.post(f"{API_BASE_URL}/generate/image-to-video-base64-json", json=payload_fast)

    if response_preview.status_code == 200 and response_fast.status_code == 200:
        result_preview = response_preview.json()
        result_fast = response_fast.json()

        print("✅ Comparación iniciada exitosamente!")
        print(f"\n📊 Veo Preview ID: {result_preview['operation_id']}")
        print("   - Prioridad: Calidad visual")
        print("   - Tiempo estimado: Mayor")
        print("   - Uso recomendado: Producción final")

        print(f"\n🚀 Veo Fast ID: {result_fast['operation_id']}")
        print("   - Prioridad: Velocidad")
        print("   - Tiempo estimado: Menor")
        print("   - Uso recomendado: Iteraciones rápidas")

        return result_preview['operation_id'], result_fast['operation_id']
    else:
        print("❌ Error en comparación")
        print(f"Preview: {response_preview.status_code}")
        print(f"Fast: {response_fast.status_code}")

def example_form_upload_with_model():
    """Ejemplo usando form upload con selector de modelo"""

    # Crear imagen de prueba
    test_image_path = Path("test_image.png")

    if not test_image_path.exists():
        # Crear imagen PNG simple si no existe
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==")
        with open(test_image_path, 'wb') as f:
            f.write(png_data)

    # Form data
    form_data = {
        'prompt': 'A beautiful sunset over the ocean with gentle waves',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'veo_model': 'veo-3.0-fast-generate-001',  # Elegir modelo
        'negative_prompt': 'storm, dark clouds'
    }

    # Files
    files = {
        'file': ('test.png', open(test_image_path, 'rb'), 'image/png')
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/generate/image-to-video-base64",
            data=form_data,
            files=files
        )

        if response.status_code == 200:
            result = response.json()
            print("📤 Upload con modelo específico exitoso:")
            print(f"Operation ID: {result['operation_id']}")
            print(f"Modelo usado: {form_data['veo_model']}")
            return result['operation_id']
        else:
            print(f"❌ Error en upload: {response.status_code}")
            print(response.text)
    finally:
        files['file'][1].close()
        if test_image_path.exists():
            test_image_path.unlink()  # Limpiar archivo temporal

def check_operation_status(operation_id):
    """Verificar el estado de una operación"""

    response = requests.get(f"{API_BASE_URL}/status/{operation_id}")

    if response.status_code == 200:
        result = response.json()
        print(f"\n📊 Estado de operación {operation_id}:")
        print(f"Status: {result.get('status', 'unknown')}")

        if result.get('status') == 'completed':
            print(f"✅ Video listo!")
            print(f"Download: {API_BASE_URL}/download/{operation_id}")
        elif result.get('status') == 'failed':
            print(f"❌ Error: {result.get('error_message', 'Unknown error')}")
        else:
            print(f"🔄 En progreso...")

        return result
    else:
        print(f"❌ Error checking status: {response.status_code}")

def demonstrate_model_selection_strategy():
    """Demuestra cuándo usar cada modelo"""

    print("🎯 GUÍA DE SELECCIÓN DE MODELO VEO")
    print("=" * 50)

    print("\n🏆 VEO-3.0-GENERATE-PREVIEW:")
    print("✅ Usar cuando:")
    print("  - Necesitas máxima calidad visual")
    print("  - Es contenido para producción final")
    print("  - El tiempo no es crítico")
    print("  - Quieres el mejor resultado posible")

    print("\n🚀 VEO-3.0-FAST-GENERATE-001:")
    print("✅ Usar cuando:")
    print("  - Necesitas resultados rápidos")
    print("  - Estás prototipando o iterando")
    print("  - Haces pruebas de concepto")
    print("  - La velocidad es más importante que la calidad perfecta")

    print("\n💡 CASOS DE USO RECOMENDADOS:")
    print("📺 Contenido comercial → Preview")
    print("🎨 Arte final → Preview")
    print("📱 Redes sociales → Fast (para iteración rápida)")
    print("🧪 Testing/Prototipos → Fast")
    print("🎬 Trailers/Promos → Preview")
    print("📊 Demos técnicos → Fast")

if __name__ == "__main__":
    print("🎬 Ejemplos de Selector de Modelo Veo")
    print("=" * 50)

    # Mostrar guía
    demonstrate_model_selection_strategy()

    print("\n" + "=" * 50)
    print("🧪 EJECUTANDO EJEMPLOS:")

    # Ejemplo 1: Texto a video con Preview
    print("\n1️⃣ Texto a Video (Preview - Calidad alta):")
    operation_preview = example_text_to_video_preview()

    # Ejemplo 2: Texto a video con Fast
    print("\n2️⃣ Texto a Video (Fast - Velocidad alta):")
    operation_fast = example_text_to_video_fast()

    # Ejemplo 3: Comparación imagen a video
    print("\n3️⃣ Comparación Imagen a Video:")
    operations = example_image_to_video_comparison()

    # Ejemplo 4: Form upload
    print("\n4️⃣ Form Upload con selector:")
    operation_form = example_form_upload_with_model()

    print("\n" + "=" * 50)
    print("✅ Todos los ejemplos enviados!")
    print("\n💡 Para verificar el estado de cualquier operación, usa:")
    print("   check_operation_status('operation_id')")

    # Ejemplo de verificación de estado
    if operation_preview:
        print(f"\n🔍 Verificando estado del primer video...")
        check_operation_status(operation_preview)

    print("\n🎯 Tip: Compara los tiempos de procesamiento entre Preview y Fast!")