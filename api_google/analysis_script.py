#!/usr/bin/env python3
"""
Script de análisis de datos existentes - SOLO LECTURA
"""
import psycopg2
import pandas as pd
from datetime import datetime, timedelta
import json

def analyze_api_usage():
    """Analiza uso de API sin modificar nada"""
    
    # Conexión a BD (solo lectura)
    conn = psycopg2.connect(
        host="localhost",
        port="5433", 
        database="frontend_db",
        user="postgres",
        password="password"
    )
    
    print("=== ANÁLISIS DE USO DE API ===")
    
    # 1. Análisis de uso por hora
    query = """
    SELECT 
        DATE_TRUNC('hour', request_timestamp) as hour,
        COUNT(*) as calls_per_hour,
        AVG(duration_ms) as avg_duration_ms,
        COUNT(CASE WHEN response_status_code >= 400 THEN 1 END) as error_count
    FROM api_google.google_api_calls 
    WHERE request_timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY hour 
    ORDER BY hour DESC;
    """
    
    df = pd.read_sql(query, conn)
    
    if not df.empty:
        print(f"📊 Total de horas analizadas: {len(df)}")
        print(f"📈 Promedio de calls por hora: {df['calls_per_hour'].mean():.1f}")
        print(f"⏱️ Promedio de duración: {df['avg_duration_ms'].mean():.1f}ms")
        print(f"❌ Total de errores: {df['error_count'].sum()}")
        
        # Detectar patrones de alto uso
        high_usage_hours = df[df['calls_per_hour'] > 50]
        if not high_usage_hours.empty:
            print(f"🚨 Horas de alto uso (>50 calls): {len(high_usage_hours)}")
    
    # 2. Análisis de errores
    error_query = """
    SELECT 
        response_status_code,
        COUNT(*) as count,
        endpoint
    FROM api_google.google_api_calls 
    WHERE request_timestamp >= NOW() - INTERVAL '7 days'
    AND response_status_code >= 400
    GROUP BY response_status_code, endpoint
    ORDER BY count DESC;
    """
    
    error_df = pd.read_sql(error_query, conn)
    
    if not error_df.empty:
        print(f"\n=== ANÁLISIS DE ERRORES ===")
        print(f"❌ Total de errores: {error_df['count'].sum()}")
        
        # Detectar errores de rate limiting
        rate_limit_errors = error_df[error_df['response_status_code'] == 429]
        quota_errors = error_df[error_df['response_status_code'] == 403]
        
        if not rate_limit_errors.empty:
            print(f"🚫 Errores 429 (Rate Limit): {rate_limit_errors['count'].sum()}")
        if not quota_errors.empty:
            print(f"💳 Errores 403 (Quota): {quota_errors['count'].sum()}")
    
    # 3. Análisis de operaciones de video
    video_query = """
    SELECT 
        status,
        COUNT(*) as count,
        AVG(duration) as avg_duration
    FROM api_google.video_operations 
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY status;
    """
    
    video_df = pd.read_sql(video_query, conn)
    
    if not video_df.empty:
        print(f"\n=== OPERACIONES DE VIDEO ===")
        for _, row in video_df.iterrows():
            print(f"📹 {row['status']}: {row['count']} operaciones (avg: {row['avg_duration']:.1f}s)")
    
    conn.close()
    print(f"\n✅ Análisis completado - Sin modificaciones")
    return df

if __name__ == "__main__":
    data = analyze_api_usage()
