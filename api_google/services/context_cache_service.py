"""
Servicio de Caching de Contexto para Optimización de Costos
Cache inteligente para reutilizar análisis y reducir costos de API
"""
import json
import hashlib
import time
from typing import Optional, Dict, Any, List
import redis
from datetime import datetime, timedelta
from utils.logger import setup_logger
from utils.config import get_settings

logger = setup_logger(__name__)

class ContextCacheService:
    """Servicio para caching inteligente de contexto de análisis"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis_client = redis.Redis(
            host=self.settings.REDIS_HOST,
            port=self.settings.REDIS_PORT,
            db=self.settings.REDIS_DB,
            decode_responses=True
        )
        self.cache_ttl = 3600  # 1 hora por defecto
        self.similarity_threshold = 0.85  # 85% de similitud para reutilizar
        
    def _generate_content_hash(self, content: str, analysis_type: str) -> str:
        """Genera hash único para contenido y tipo de análisis"""
        content_normalized = content.strip().lower()
        hash_input = f"{analysis_type}:{content_normalized}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    async def cache_analysis_context(self, 
                                   content: str, 
                                   analysis_type: str, 
                                   analysis_result: Dict[str, Any],
                                   ttl_seconds: Optional[int] = None) -> str:
        """
        Cache de contexto de análisis para reutilización
        
        Args:
            content: Contenido analizado (texto, imagen base64, etc.)
            analysis_type: Tipo de análisis (image, video, text)
            analysis_result: Resultado del análisis
            ttl_seconds: Tiempo de vida del cache en segundos
            
        Returns:
            str: Hash del contenido cacheado
        """
        try:
            content_hash = self._generate_content_hash(content, analysis_type)
            cache_key = f"analysis_context:{content_hash}"
            
            # Preparar datos para cache
            cache_data = {
                "content_hash": content_hash,
                "analysis_type": analysis_type,
                "analysis_result": analysis_result,
                "cached_at": datetime.now().isoformat(),
                "ttl": ttl_seconds or self.cache_ttl,
                "hit_count": 0
            }
            
            # Guardar en Redis
            ttl = ttl_seconds or self.cache_ttl
            self.redis_client.setex(
                cache_key, 
                ttl, 
                json.dumps(cache_data, default=str)
            )
            
            logger.info(f"✅ Contexto cacheado: {content_hash[:8]}... (TTL: {ttl}s)")
            return content_hash
            
        except Exception as e:
            logger.error(f"❌ Error cacheando contexto: {e}")
            raise
    
    async def get_cached_analysis(self, 
                                 content: str, 
                                 analysis_type: str) -> Optional[Dict[str, Any]]:
        """
        Recuperar análisis del cache si existe
        
        Args:
            content: Contenido a analizar
            analysis_type: Tipo de análisis
            
        Returns:
            Optional[Dict]: Resultado cacheado o None si no existe
        """
        try:
            content_hash = self._generate_content_hash(content, analysis_type)
            cache_key = f"analysis_context:{content_hash}"
            
            # Buscar en cache
            cached_data = self.redis_client.get(cache_key)
            if not cached_data:
                logger.debug(f"Cache miss: {content_hash[:8]}...")
                return None
            
            # Parsear datos cacheados
            cache_data = json.loads(cached_data)
            
            # Incrementar contador de hits
            cache_data["hit_count"] += 1
            cache_data["last_accessed"] = datetime.now().isoformat()
            
            # Actualizar cache con nuevo hit count
            self.redis_client.setex(
                cache_key,
                cache_data["ttl"],
                json.dumps(cache_data, default=str)
            )
            
            logger.info(f"✅ Cache hit: {content_hash[:8]}... (hits: {cache_data['hit_count']})")
            return cache_data["analysis_result"]
            
        except Exception as e:
            logger.error(f"❌ Error recuperando cache: {e}")
            return None
    
    async def find_similar_analysis(self, 
                                   content: str, 
                                   analysis_type: str,
                                   similarity_threshold: float = None) -> Optional[Dict[str, Any]]:
        """
        Buscar análisis similar en cache para reutilización
        
        Args:
            content: Contenido a analizar
            analysis_type: Tipo de análisis
            similarity_threshold: Umbral de similitud (0.0-1.0)
            
        Returns:
            Optional[Dict]: Análisis similar o None
        """
        try:
            threshold = similarity_threshold or self.similarity_threshold
            content_hash = self._generate_content_hash(content, analysis_type)
            
            # Buscar patrones similares en cache
            pattern = f"analysis_context:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                cached_data = self.redis_client.get(key)
                if not cached_data:
                    continue
                    
                cache_data = json.loads(cached_data)
                
                # Verificar tipo de análisis
                if cache_data.get("analysis_type") != analysis_type:
                    continue
                
                # Calcular similitud (simplificado)
                similarity = self._calculate_similarity(content, cache_data.get("content", ""))
                
                if similarity >= threshold:
                    logger.info(f"✅ Análisis similar encontrado: {similarity:.2f} similitud")
                    return cache_data["analysis_result"]
            
            logger.debug(f"No se encontró análisis similar (threshold: {threshold})")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error buscando análisis similar: {e}")
            return None
    
    def _calculate_similarity(self, content1: str, content2: str) -> float:
        """Calcula similitud entre dos contenidos (simplificado)"""
        try:
            # Normalizar contenidos
            norm1 = content1.strip().lower()
            norm2 = content2.strip().lower()
            
            # Similitud básica por longitud y caracteres comunes
            if len(norm1) == 0 or len(norm2) == 0:
                return 0.0
            
            # Calcular intersección de caracteres
            set1 = set(norm1)
            set2 = set(norm2)
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            
            if union == 0:
                return 0.0
            
            jaccard_similarity = intersection / union
            
            # Ajustar por longitud similar
            length_ratio = min(len(norm1), len(norm2)) / max(len(norm1), len(norm2))
            
            # Combinar métricas
            similarity = (jaccard_similarity * 0.7) + (length_ratio * 0.3)
            
            return min(similarity, 1.0)
            
        except Exception as e:
            logger.error(f"❌ Error calculando similitud: {e}")
            return 0.0
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas del cache"""
        try:
            pattern = f"analysis_context:*"
            keys = self.redis_client.keys(pattern)
            
            total_entries = len(keys)
            total_hits = 0
            analysis_types = {}
            
            for key in keys:
                cached_data = self.redis_client.get(key)
                if cached_data:
                    cache_data = json.loads(cached_data)
                    total_hits += cache_data.get("hit_count", 0)
                    
                    analysis_type = cache_data.get("analysis_type", "unknown")
                    analysis_types[analysis_type] = analysis_types.get(analysis_type, 0) + 1
            
            return {
                "total_entries": total_entries,
                "total_hits": total_hits,
                "analysis_types": analysis_types,
                "hit_rate": total_hits / max(total_entries, 1),
                "cache_size_mb": self._get_cache_size_mb()
            }
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo estadísticas: {e}")
            return {}
    
    def _get_cache_size_mb(self) -> float:
        """Obtener tamaño del cache en MB"""
        try:
            info = self.redis_client.info("memory")
            return info.get("used_memory", 0) / (1024 * 1024)
        except:
            return 0.0
    
    async def clear_cache(self, analysis_type: Optional[str] = None) -> int:
        """
        Limpiar cache por tipo de análisis o todo
        
        Args:
            analysis_type: Tipo de análisis a limpiar (opcional)
            
        Returns:
            int: Número de entradas eliminadas
        """
        try:
            if analysis_type:
                pattern = f"analysis_context:*"
                keys = self.redis_client.keys(pattern)
                deleted_count = 0
                
                for key in keys:
                    cached_data = self.redis_client.get(key)
                    if cached_data:
                        cache_data = json.loads(cached_data)
                        if cache_data.get("analysis_type") == analysis_type:
                            self.redis_client.delete(key)
                            deleted_count += 1
                
                logger.info(f"✅ Cache limpiado: {deleted_count} entradas de {analysis_type}")
                return deleted_count
            else:
                pattern = f"analysis_context:*"
                keys = self.redis_client.keys(pattern)
                deleted_count = len(keys)
                
                if keys:
                    self.redis_client.delete(*keys)
                
                logger.info(f"✅ Cache completamente limpiado: {deleted_count} entradas")
                return deleted_count
                
        except Exception as e:
            logger.error(f"❌ Error limpiando cache: {e}")
            return 0

# Instancia global del servicio
context_cache_service = ContextCacheService()
