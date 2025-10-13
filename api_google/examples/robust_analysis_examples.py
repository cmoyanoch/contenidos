#!/usr/bin/env python3
"""
Ejemplos de uso de la API de Análisis Robusto

Demuestra cómo usar los nuevos endpoints para análisis detallado de:
- Imágenes con análisis completo de composición, colores, estilo
- Videos con análisis frame-by-frame y generación de continuidad
- Extracción de metadatos técnicos
- Generación de prompts para replicación
"""

import requests
import json
import base64
from pathlib import Path

# Configuración
API_BASE_URL = "http://localhost:8001/api/v1"

def example_robust_image_analysis():
    """Ejemplo de análisis robusto de imagen"""

    # Imagen base64 de ejemplo (1x1 pixel para prueba)
    sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    payload = {
        "image_base64": sample_image,
        "content_type": "image/png",
        "analysis_prompt": "Analiza esta imagen de manera extremadamente detallada, enfocándote en aspectos técnicos y artísticos para poder replicarla perfectamente",
        "detailed_analysis": True,
        "extract_metadata": True,
        "analyze_composition": True,
        "analyze_style": True,
        "analyze_colors": True
    }

    print("🔍 Iniciando análisis robusto de imagen...")
    response = requests.post(f"{API_BASE_URL}/analyze/image", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("✅ Análisis de imagen completado!")
        print(f"Analysis ID: {result['analysis_id']}")
        print(f"Procesamiento: {result['processing_time_seconds']:.2f}s")

        print("\n📊 RESULTADOS DEL ANÁLISIS:")
        print("=" * 50)

        print(f"\n🎨 Descripción General:")
        print(f"  {result['overall_description']}")

        print(f"\n🖼️ Estilo Visual:")
        print(f"  {result['visual_style']}")

        print(f"\n⚙️ Calidad Técnica:")
        print(f"  {result['technical_quality']}")

        if result.get('composition_analysis'):
            print(f"\n📐 Análisis de Composición:")
            print(f"  {result['composition_analysis']}")

        if result.get('color_palette'):
            print(f"\n🌈 Paleta de Colores:")
            for color in result['color_palette']:
                print(f"  - {color}")

        if result.get('lighting_analysis'):
            print(f"\n💡 Análisis de Iluminación:")
            print(f"  {result['lighting_analysis']}")

        if result.get('subject_identification'):
            print(f"\n👥 Sujetos Identificados:")
            for subject in result['subject_identification']:
                print(f"  - {subject}")

        print(f"\n🎭 Estilo Artístico:")
        print(f"  {result['artistic_style']}")

        print(f"\n📝 Prompt de Replicación:")
        print(f"  {result['replication_prompt']}")

        if result.get('technical_metadata'):
            metadata = result['technical_metadata']
            print(f"\n🔧 Metadatos Técnicos:")
            if metadata.get('resolution'):
                print(f"  - Resolución: {metadata['resolution']}")
            if metadata.get('aspect_ratio'):
                print(f"  - Aspecto: {metadata['aspect_ratio']}")
            if metadata.get('file_size_bytes'):
                print(f"  - Tamaño: {metadata['file_size_bytes']} bytes")

        return result['analysis_id']
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def example_robust_video_analysis():
    """Ejemplo de análisis robusto de video"""

    # Video base64 de ejemplo (mínimo para prueba)
    sample_video_b64 = "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAMFtZGF0"

    payload = {
        "video_base64": sample_video_b64,
        "content_type": "video/mp4",
        "analysis_prompt": "Analiza este video frame por frame para identificar patrones de movimiento, transiciones y contenido para generar continuidad",
        "detailed_analysis": True,
        "extract_metadata": True,
        "frame_analysis": True,
        "extract_keyframes": True,
        "analyze_motion": True,
        "analyze_audio": False
    }

    print("\n🎬 Iniciando análisis robusto de video...")
    response = requests.post(f"{API_BASE_URL}/analyze/video", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("✅ Análisis de video completado!")
        print(f"Analysis ID: {result['analysis_id']}")
        print(f"Procesamiento: {result['processing_time_seconds']:.2f}s")

        print("\n📊 RESULTADOS DEL ANÁLISIS:")
        print("=" * 50)

        print(f"\n🎬 Descripción General:")
        print(f"  {result['overall_description']}")

        print(f"\n🎨 Estilo Visual:")
        print(f"  {result['visual_style']}")

        print(f"\n📹 Frames Analizados:")
        print(f"  Total: {result['frame_count']}")

        if result.get('keyframes_analysis'):
            print(f"\n🔑 Keyframes Importantes:")
            for i, frame in enumerate(result['keyframes_analysis'][:3]):  # Mostrar solo primeros 3
                print(f"  Frame {frame['frame_number']} ({frame['timestamp']}s):")
                print(f"    {frame['description']}")

        print(f"\n🌊 Análisis de Movimiento:")
        print(f"  {result['motion_analysis']}")

        if result.get('scene_transitions'):
            print(f"\n🔄 Transiciones de Escena:")
            for transition in result['scene_transitions']:
                print(f"  - {transition}")

        print(f"\n🔗 Descripción de Continuidad:")
        print(f"  {result['continuity_description']}")

        print(f"\n🖼️ Último Frame:")
        print(f"  {result['last_frame_description']}")

        print(f"\n📝 Prompt de Extensión:")
        print(f"  {result['extension_prompt']}")

        if result.get('technical_metadata'):
            metadata = result['technical_metadata']
            print(f"\n🔧 Metadatos Técnicos:")
            if metadata.get('duration'):
                print(f"  - Duración: {metadata['duration']}s")
            if metadata.get('fps'):
                print(f"  - FPS: {metadata['fps']}")
            if metadata.get('resolution'):
                print(f"  - Resolución: {metadata['resolution']}")

        return result['analysis_id']
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def example_generate_continuity(analysis_id):
    """Ejemplo de generación de continuidad basada en análisis"""

    if not analysis_id:
        print("⚠️ Necesitas un analysis_id válido para generar continuidad")
        return

    payload = {
        "original_video_analysis_id": analysis_id,
        "extension_duration": 8.0,
        "continuity_style": "smooth",
        "custom_direction": "Continúa la acción de manera natural manteniendo el mismo estilo visual",
        "maintain_subjects": True
    }

    print(f"\n🔗 Generando continuidad para análisis: {analysis_id}")
    response = requests.post(f"{API_BASE_URL}/analyze/generate-continuity", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("✅ Generación de continuidad completada!")
        print(f"Generation ID: {result['generation_id']}")

        print("\n📊 RESULTADO DE CONTINUIDAD:")
        print("=" * 50)

        print(f"\n🔗 ID de Generación:")
        print(f"  {result['generation_id']}")

        print(f"\n📝 Prompt de Extensión:")
        print(f"  {result['extension_prompt']}")

        print(f"\n⚙️ Estado:")
        print(f"  {result['status']}")

        if result.get('video_generation_operation_id'):
            print(f"\n🎬 ID de Operación de Video:")
            print(f"  {result['video_generation_operation_id']}")
            print(f"  Puedes verificar el estado en: /api/v1/status/{result['video_generation_operation_id']}")

        return result['generation_id']
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def example_compare_analysis_types():
    """Ejemplo comparando diferentes tipos de análisis"""

    print("\n🔬 COMPARACIÓN DE TIPOS DE ANÁLISIS")
    print("=" * 50)

    # Imagen con análisis básico
    basic_payload = {
        "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "content_type": "image/png",
        "detailed_analysis": False,
        "analyze_composition": False,
        "analyze_style": False,
        "analyze_colors": False
    }

    # Imagen con análisis completo
    detailed_payload = {
        "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "content_type": "image/png",
        "detailed_analysis": True,
        "analyze_composition": True,
        "analyze_style": True,
        "analyze_colors": True,
        "analysis_prompt": "Análisis extremadamente detallado enfocado en replicación exacta"
    }

    print("\n📊 Análisis Básico...")
    basic_response = requests.post(f"{API_BASE_URL}/analyze/image", json=basic_payload)

    print("\n📊 Análisis Detallado...")
    detailed_response = requests.post(f"{API_BASE_URL}/analyze/image", json=detailed_payload)

    if basic_response.status_code == 200 and detailed_response.status_code == 200:
        basic_result = basic_response.json()
        detailed_result = detailed_response.json()

        print(f"\n⚡ COMPARACIÓN DE TIEMPOS:")
        print(f"  Básico: {basic_result['processing_time_seconds']:.2f}s")
        print(f"  Detallado: {detailed_result['processing_time_seconds']:.2f}s")

        print(f"\n📝 COMPARACIÓN DE CONTENIDO:")
        print(f"  Básico - Descripción: {len(basic_result['overall_description'])} caracteres")
        print(f"  Detallado - Descripción: {len(detailed_result['overall_description'])} caracteres")

        print(f"\n🎨 ANÁLISIS ADICIONAL (Solo en Detallado):")
        print(f"  - Composición: {'✅' if detailed_result.get('composition_analysis') else '❌'}")
        print(f"  - Colores: {'✅' if detailed_result.get('color_palette') else '❌'}")
        print(f"  - Iluminación: {'✅' if detailed_result.get('lighting_analysis') else '❌'}")
        print(f"  - Prompt Replicación: {'✅' if detailed_result.get('replication_prompt') else '❌'}")

def demonstrate_api_capabilities():
    """Demuestra las capacidades completas de la API"""

    print("🚀 DEMOSTRACIÓN COMPLETA DE API DE ANÁLISIS ROBUSTO")
    print("=" * 60)

    print("\n💡 CAPACIDADES IMPLEMENTADAS:")
    print("✅ Análisis detallado de imágenes con:")
    print("  - Composición fotográfica")
    print("  - Paleta de colores")
    print("  - Estilo artístico")
    print("  - Calidad técnica")
    print("  - Prompt de replicación")

    print("\n✅ Análisis de videos con:")
    print("  - Análisis frame-by-frame")
    print("  - Keyframes importantes")
    print("  - Patrones de movimiento")
    print("  - Descripción de continuidad")
    print("  - Prompt de extensión")

    print("\n✅ Generación de continuidad:")
    print("  - Extensión desde último frame")
    print("  - Estilos de continuidad")
    print("  - Integración con generación de videos")

    print("\n🎯 CASOS DE USO RECOMENDADOS:")
    print("📸 Análisis de Imágenes:")
    print("  - Replicación de estilos fotográficos")
    print("  - Análisis de composición para mejoras")
    print("  - Extracción de paletas de colores")
    print("  - Generación de prompts descriptivos")

    print("\n🎬 Análisis de Videos:")
    print("  - Análisis de contenido para categorización")
    print("  - Extracción de keyframes representativos")
    print("  - Análisis de movimiento y transiciones")
    print("  - Preparación para extensión de duración")

    print("\n🔗 Generación de Continuidad:")
    print("  - Extensión de videos cortos")
    print("  - Creación de secuencias más largas")
    print("  - Mantenimiento de coherencia visual")
    print("  - Automatización de narrativa")

if __name__ == "__main__":
    print("🔍 Ejemplos de API de Análisis Robusto")
    print("=" * 50)

    # Mostrar capacidades
    demonstrate_api_capabilities()

    print("\n" + "=" * 50)
    print("🧪 EJECUTANDO EJEMPLOS:")

    # Ejemplo 1: Análisis robusto de imagen
    print("\n1️⃣ Análisis Robusto de Imagen:")
    image_analysis_id = example_robust_image_analysis()

    # Ejemplo 2: Análisis robusto de video
    print("\n2️⃣ Análisis Robusto de Video:")
    video_analysis_id = example_robust_video_analysis()

    # Ejemplo 3: Generación de continuidad
    if video_analysis_id:
        print("\n3️⃣ Generación de Continuidad:")
        continuity_id = example_generate_continuity(video_analysis_id)

    # Ejemplo 4: Comparación de tipos
    print("\n4️⃣ Comparación de Análisis:")
    example_compare_analysis_types()

    print("\n" + "=" * 50)
    print("✅ Todos los ejemplos ejecutados!")
    print("\n💡 Para usar la API en producción:")
    print("  - Usa imágenes reales en lugar de samples")
    print("  - Ajusta analysis_prompt según tus necesidades")
    print("  - Guarda los analysis_id para referencia futura")
    print("  - Integra con tu workflow de generación de contenido")

    print("\n🎯 Próximos pasos sugeridos:")
    print("  - Implementar análisis frame-by-frame real para videos")
    print("  - Agregar soporte para más formatos de video")
    print("  - Integrar con pipeline de generación automática")
    print("  - Optimizar tiempos de procesamiento")