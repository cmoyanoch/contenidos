#!/usr/bin/env python3
"""
Ejemplos de uso de capacidades avanzadas de análisis de imágenes
- Detección de objetos con Gemini 2.0+
- Segmentación con Gemini 2.5+
"""

import requests
import base64
import json
from pathlib import Path

# Configuración
API_BASE_URL = "http://localhost:8001"
TEST_IMAGE_PATH = "test_image.jpg"  # Ruta a una imagen de prueba

def create_test_image():
    """Crear una imagen de prueba simple"""
    from PIL import Image, ImageDraw, ImageFont
    
    # Crear imagen de prueba
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    
    # Dibujar formas simples
    draw.rectangle([50, 50, 150, 150], fill='red', outline='black')
    draw.ellipse([200, 50, 300, 150], fill='blue', outline='black')
    draw.polygon([(350, 50), (400, 100), (350, 150)], fill='green', outline='black')
    
    # Guardar imagen
    img.save(TEST_IMAGE_PATH)
    print(f"✅ Imagen de prueba creada: {TEST_IMAGE_PATH}")

def encode_image_to_base64(image_path: str) -> str:
    """Codificar imagen a base64"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_object_detection():
    """Probar detección de objetos con Gemini 2.0+"""
    print("\n🔍 Probando detección de objetos...")
    
    # Codificar imagen
    image_base64 = encode_image_to_base64(TEST_IMAGE_PATH)
    
    payload = {
        "image_base64": image_base64,
        "content_type": "image/jpeg",
        "analysis_prompt": "Identifica todos los objetos en esta imagen y proporciona sus coordenadas aproximadas",
        "detailed_analysis": True,
        "extract_metadata": True
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/analyze/image/object-detection",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Detección de objetos exitosa:")
            print(f"   - Analysis ID: {result['analysis_id']}")
            print(f"   - Descripción: {result['overall_description'][:100]}...")
            print(f"   - Tiempo de procesamiento: {result['processing_time_seconds']:.2f}s")
            return result
        else:
            print(f"❌ Error en detección de objetos: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error en detección de objetos: {e}")
        return None

def test_segmentation():
    """Probar segmentación con Gemini 2.5+"""
    print("\n🎯 Probando segmentación...")
    
    # Codificar imagen
    image_base64 = encode_image_to_base64(TEST_IMAGE_PATH)
    
    payload = {
        "image_base64": image_base64,
        "content_type": "image/jpeg",
        "analysis_prompt": "Segmenta esta imagen identificando todas las regiones y objetos",
        "detailed_analysis": True,
        "extract_metadata": True
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/analyze/image/segmentation",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Segmentación exitosa:")
            print(f"   - Analysis ID: {result['analysis_id']}")
            print(f"   - Descripción: {result['overall_description'][:100]}...")
            print(f"   - Tiempo de procesamiento: {result['processing_time_seconds']:.2f}s")
            return result
        else:
            print(f"❌ Error en segmentación: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error en segmentación: {e}")
        return None

def test_standard_analysis():
    """Probar análisis estándar para comparación"""
    print("\n📊 Probando análisis estándar...")
    
    # Codificar imagen
    image_base64 = encode_image_to_base64(TEST_IMAGE_PATH)
    
    payload = {
        "image_base64": image_base64,
        "content_type": "image/jpeg",
        "analysis_prompt": "Analiza esta imagen de manera general",
        "detailed_analysis": True,
        "extract_metadata": True
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/analyze/image",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Análisis estándar exitoso:")
            print(f"   - Analysis ID: {result['analysis_id']}")
            print(f"   - Descripción: {result['overall_description'][:100]}...")
            print(f"   - Tiempo de procesamiento: {result['processing_time_seconds']:.2f}s")
            return result
        else:
            print(f"❌ Error en análisis estándar: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error en análisis estándar: {e}")
        return None

def compare_results(standard_result, object_detection_result, segmentation_result):
    """Comparar resultados de diferentes métodos"""
    print("\n📈 Comparación de resultados:")
    print("=" * 50)
    
    if standard_result:
        print(f"📊 Análisis estándar:")
        print(f"   - Tiempo: {standard_result['processing_time_seconds']:.2f}s")
        print(f"   - Descripción: {standard_result['overall_description'][:80]}...")
    
    if object_detection_result:
        print(f"🔍 Detección de objetos:")
        print(f"   - Tiempo: {object_detection_result['processing_time_seconds']:.2f}s")
        print(f"   - Descripción: {object_detection_result['overall_description'][:80]}...")
    
    if segmentation_result:
        print(f"🎯 Segmentación:")
        print(f"   - Tiempo: {segmentation_result['processing_time_seconds']:.2f}s")
        print(f"   - Descripción: {segmentation_result['overall_description'][:80]}...")

def main():
    """Función principal"""
    print("�� Ejemplos de Capacidades Avanzadas de Análisis de Imágenes")
    print("=" * 60)
    
    # Crear imagen de prueba
    create_test_image()
    
    # Probar diferentes métodos
    standard_result = test_standard_analysis()
    object_detection_result = test_object_detection()
    segmentation_result = test_segmentation()
    
    # Comparar resultados
    compare_results(standard_result, object_detection_result, segmentation_result)
    
    # Limpiar archivo de prueba
    if Path(TEST_IMAGE_PATH).exists():
        Path(TEST_IMAGE_PATH).unlink()
        print(f"\n🧹 Archivo de prueba eliminado: {TEST_IMAGE_PATH}")
    
    print("\n✅ Ejemplos completados!")

if __name__ == "__main__":
    main()
