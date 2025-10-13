#!/usr/bin/env python3
"""
Ejemplos de uso para Batch Image Analysis API

Muestra cómo usar el nuevo endpoint de análisis batch de imágenes
"""
import requests
import json
import base64
from pathlib import Path

# Configuración
API_BASE_URL = "http://localhost:8001/api/v1"

def encode_image_to_base64(image_path: str) -> str:
    """Convierte imagen a base64"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def example_basic_batch_analysis():
    """Ejemplo básico de análisis batch"""

    # Ejemplo con imágenes base64 (simuladas)
    batch_request = {
        "batch_name": "Análisis de productos",
        "temperature": 0.7,
        "max_output_tokens": 1024,
        "items": [
            {
                "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",  # 1x1 pixel transparente
                "prompt": "Describe esta imagen en detalle",
                "content_type": "image/png",
                "metadata": {"product_id": "12345", "category": "electronics"}
            },
            {
                "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                "prompt": "¿Qué colores predominan en esta imagen?",
                "content_type": "image/png",
                "metadata": {"product_id": "67890", "category": "clothing"}
            }
        ]
    }

    response = requests.post(
        f"{API_BASE_URL}/batch/analyze-images",
        json=batch_request,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code == 200:
        result = response.json()
        print("✅ Análisis batch exitoso!")
        print(f"Batch ID: {result['batch_id']}")
        print(f"Procesados: {result['successful_items']}/{result['total_items']}")
        print(f"Tiempo: {result['processing_time_seconds']:.2f}s")
        print(f"Tokens usados: {result['total_tokens_used']}")

        for item_result in result['results']:
            print(f"\nImagen {item_result['index']}:")
            if item_result['success']:
                print(f"  Análisis: {item_result['analysis'][:100]}...")
                print(f"  Tokens: {item_result['tokens_used']}")
            else:
                print(f"  Error: {item_result['error']}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def example_content_moderation():
    """Ejemplo para moderación de contenido"""

    batch_request = {
        "batch_name": "Moderación de contenido",
        "temperature": 0.1,  # Baja temperatura para consistencia
        "max_output_tokens": 256,
        "items": [
            {
                "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                "prompt": "Analiza esta imagen y clasifica si es apropiada para todas las edades. Responde solo: APROPIADA, INAPROPIADA, o DUDOSA, seguido de una breve justificación.",
                "content_type": "image/png",
                "metadata": {"user_id": "user123", "upload_time": "2025-09-28T10:00:00Z"}
            }
        ]
    }

    response = requests.post(f"{API_BASE_URL}/batch/analyze-images", json=batch_request)

    if response.status_code == 200:
        result = response.json()
        print("🛡️ Moderación completada:")
        for item_result in result['results']:
            if item_result['success']:
                classification = item_result['analysis']
                print(f"Resultado: {classification}")
            else:
                print(f"Error en moderación: {item_result['error']}")

def example_product_categorization():
    """Ejemplo para categorización de productos"""

    batch_request = {
        "batch_name": "Categorización de productos e-commerce",
        "temperature": 0.3,
        "max_output_tokens": 512,
        "items": [
            {
                "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                "prompt": "Analiza esta imagen de producto y proporciona: 1) Categoría principal, 2) Subcategoría, 3) Colores principales, 4) Materiales aparentes, 5) Estilo/ocasión de uso. Formato JSON.",
                "content_type": "image/png",
                "metadata": {"sku": "PROD001", "source": "supplier_a"}
            },
            {
                "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                "prompt": "Identifica el tipo de producto, marca visible (si la hay), y características distintivas. Sugiere tags de SEO relevantes.",
                "content_type": "image/png",
                "metadata": {"sku": "PROD002", "source": "supplier_b"}
            }
        ]
    }

    response = requests.post(f"{API_BASE_URL}/batch/analyze-images", json=batch_request)

    if response.status_code == 200:
        result = response.json()
        print("🏷️ Categorización completada:")
        for i, item_result in enumerate(result['results']):
            if item_result['success']:
                print(f"\nProducto {i+1}:")
                print(f"SKU: {item_result['metadata'].get('sku')}")
                print(f"Análisis: {item_result['analysis']}")

def example_with_real_images():
    """Ejemplo usando imágenes reales del sistema de archivos"""

    # Directorio con imágenes de ejemplo
    images_dir = Path("uploads/banana/video")

    if not images_dir.exists():
        print(f"❌ Directorio {images_dir} no existe")
        return

    # Buscar imágenes
    image_files = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))

    if not image_files:
        print(f"❌ No se encontraron imágenes en {images_dir}")
        return

    # Tomar las primeras 3 imágenes
    selected_images = image_files[:3]

    items = []
    for i, img_path in enumerate(selected_images):
        try:
            image_base64 = encode_image_to_base64(str(img_path))
            items.append({
                "image_base64": image_base64,
                "prompt": f"Describe esta imagen en detalle y explica qué elementos visuales contiene",
                "content_type": "image/jpeg" if img_path.suffix.lower() == ".jpg" else "image/png",
                "metadata": {
                    "filename": img_path.name,
                    "file_size": img_path.stat().st_size
                }
            })
        except Exception as e:
            print(f"Error procesando {img_path}: {e}")

    if not items:
        print("❌ No se pudieron procesar imágenes")
        return

    batch_request = {
        "batch_name": "Análisis de imágenes locales",
        "temperature": 0.7,
        "max_output_tokens": 1024,
        "items": items
    }

    print(f"🔍 Analizando {len(items)} imágenes locales...")

    response = requests.post(f"{API_BASE_URL}/batch/analyze-images", json=batch_request)

    if response.status_code == 200:
        result = response.json()
        print(f"✅ Análisis completado!")
        print(f"Tiempo total: {result['processing_time_seconds']:.2f}s")
        print(f"Tokens utilizados: {result['total_tokens_used']}")

        for item_result in result['results']:
            if item_result['success']:
                filename = item_result['metadata'].get('filename', 'unknown')
                print(f"\n📸 {filename}:")
                print(f"   {item_result['analysis'][:200]}...")
            else:
                print(f"\n❌ Error en imagen {item_result['index']}: {item_result['error']}")
    else:
        print(f"❌ Error en request: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    print("🔍 Ejemplos de Batch Image Analysis")
    print("=" * 50)

    print("\n1. Ejemplo básico:")
    example_basic_batch_analysis()

    print("\n2. Moderación de contenido:")
    example_content_moderation()

    print("\n3. Categorización de productos:")
    example_product_categorization()

    print("\n4. Análisis de imágenes locales:")
    example_with_real_images()

    print("\n✅ Ejemplos completados!")