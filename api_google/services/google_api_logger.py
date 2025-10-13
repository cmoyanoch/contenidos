"""
Servicio para logging completo de todas las llamadas API directas a Google
Almacena request/response completos para auditoría y debugging
"""
import uuid
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, Union

from models.database import GoogleApiCall, get_database_session
from utils.logger import setup_logger

logger = setup_logger(__name__)

class GoogleApiLogger:
    """Servicio centralizado para logging de Google API calls"""

    def __init__(self):
        self.session_cache = {}

    def start_api_call(
        self,
        api_type: str,
        endpoint: str,
        request_body: Dict[str, Any],
        operation_id: Optional[str] = None,
        method: str = "POST",
        request_headers: Optional[Dict[str, str]] = None,
        request_params: Optional[Dict[str, Any]] = None,
        user_agent: Optional[str] = None,
        client_ip: Optional[str] = None
    ) -> str:
        """
        Inicia el logging de una llamada API a Google

        Args:
            api_type: Tipo de API ('veo', 'gemini', 'genai')
            endpoint: URL del endpoint de Google
            request_body: Body completo a enviar
            operation_id: ID de operación asociada (opcional)
            method: HTTP method (POST, GET, etc.)
            request_headers: Headers de la request (sin API keys)
            request_params: Query parameters
            user_agent: User agent del cliente
            client_ip: IP del cliente

        Returns:
            call_id: UUID único para esta API call
        """
        call_id = str(uuid.uuid4())

        try:
            # Filtrar headers sensibles (API keys)
            safe_headers = self._filter_sensitive_headers(request_headers or {})

            # Crear registro de la API call
            api_call = GoogleApiCall(
                id=call_id,
                operation_id=operation_id,
                api_type=api_type,
                endpoint=endpoint,
                method=method,
                request_headers=safe_headers,
                request_body=request_body,
                request_params=request_params,
                request_timestamp=datetime.utcnow(),
                status="pending",
                user_agent=user_agent,
                client_ip=client_ip
            )

            # Guardar en BD
            session = get_database_session()
            try:
                session.add(api_call)
                session.commit()
                logger.info(f"📝 API call iniciado: {call_id} -> {api_type} ({endpoint})")
            finally:
                session.close()

            # Cache para timing
            self.session_cache[call_id] = {
                'start_time': time.time(),
                'api_type': api_type,
                'endpoint': endpoint
            }

            return call_id

        except Exception as e:
            logger.error(f"❌ Error iniciando logging API call: {e}")
            # Devolver un ID dummy para no romper el flujo
            return call_id

    def complete_api_call(
        self,
        call_id: str,
        response_status_code: int,
        response_body: Union[Dict[str, Any], str, None] = None,
        response_headers: Optional[Dict[str, str]] = None,
        status: str = "success",
        error_message: Optional[str] = None,
        google_error_code: Optional[str] = None
    ) -> None:
        """
        Completa el logging de una llamada API exitosa

        Args:
            call_id: ID de la llamada iniciada con start_api_call
            response_status_code: HTTP status code de la response
            response_body: Body completo de la response de Google
            response_headers: Headers de la response
            status: Estado final ('success', 'error', 'timeout')
            error_message: Mensaje de error si aplica
            google_error_code: Código específico de error de Google
        """
        try:
            # Calcular duración
            duration_ms = None
            if call_id in self.session_cache:
                duration_ms = int((time.time() - self.session_cache[call_id]['start_time']) * 1000)
                del self.session_cache[call_id]

            # Convertir response_body a dict si es string JSON
            if isinstance(response_body, str):
                try:
                    response_body = json.loads(response_body)
                except json.JSONDecodeError:
                    # Mantener como string si no es JSON válido
                    pass

            # Actualizar registro en BD
            session = get_database_session()
            try:
                api_call = session.query(GoogleApiCall).filter(GoogleApiCall.id == call_id).first()
                if api_call:
                    api_call.response_status_code = response_status_code
                    api_call.response_headers = response_headers
                    api_call.response_body = response_body
                    api_call.response_timestamp = datetime.utcnow()
                    api_call.duration_ms = duration_ms
                    api_call.status = status
                    api_call.error_message = error_message
                    api_call.google_error_code = google_error_code
                    api_call.updated_at = datetime.utcnow()

                    session.commit()
                    logger.info(f"✅ API call completado: {call_id} -> {status} ({duration_ms}ms)")
                else:
                    logger.warning(f"⚠️ API call no encontrado para completar: {call_id}")
            finally:
                session.close()

        except Exception as e:
            logger.error(f"❌ Error completando logging API call {call_id}: {e}")

    def fail_api_call(
        self,
        call_id: str,
        error_message: str,
        response_status_code: Optional[int] = None,
        google_error_code: Optional[str] = None,
        response_body: Union[Dict[str, Any], str, None] = None
    ) -> None:
        """
        Marca una API call como fallida

        Args:
            call_id: ID de la llamada
            error_message: Mensaje de error
            response_status_code: Status code si hay response
            google_error_code: Código de error específico de Google
            response_body: Response body si existe
        """
        self.complete_api_call(
            call_id=call_id,
            response_status_code=response_status_code or 0,
            response_body=response_body,
            status="error",
            error_message=error_message,
            google_error_code=google_error_code
        )

    def timeout_api_call(self, call_id: str, timeout_message: str) -> None:
        """
        Marca una API call como timeout

        Args:
            call_id: ID de la llamada
            timeout_message: Mensaje de timeout
        """
        self.complete_api_call(
            call_id=call_id,
            response_status_code=408,  # Request Timeout
            status="timeout",
            error_message=timeout_message
        )

    def get_api_call_logs(
        self,
        operation_id: Optional[str] = None,
        api_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> list:
        """
        Obtiene logs de API calls con filtros opcionales

        Args:
            operation_id: Filtrar por operation_id
            api_type: Filtrar por tipo de API
            status: Filtrar por status
            limit: Límite de resultados

        Returns:
            Lista de logs de API calls
        """
        try:
            session = get_database_session()
            try:
                query = session.query(GoogleApiCall)

                if operation_id:
                    query = query.filter(GoogleApiCall.operation_id == operation_id)
                if api_type:
                    query = query.filter(GoogleApiCall.api_type == api_type)
                if status:
                    query = query.filter(GoogleApiCall.status == status)

                # Ordenar por más recientes primero
                query = query.order_by(GoogleApiCall.request_timestamp.desc())
                query = query.limit(limit)

                results = query.all()

                # Convertir a dict para serialización
                logs = []
                for result in results:
                    log_dict = {
                        'id': result.id,
                        'operation_id': result.operation_id,
                        'api_type': result.api_type,
                        'endpoint': result.endpoint,
                        'method': result.method,
                        'request_headers': result.request_headers,
                        'request_body': result.request_body,
                        'request_params': result.request_params,
                        'response_status_code': result.response_status_code,
                        'response_headers': result.response_headers,
                        'response_body': result.response_body,
                        'request_timestamp': result.request_timestamp.isoformat() if result.request_timestamp else None,
                        'response_timestamp': result.response_timestamp.isoformat() if result.response_timestamp else None,
                        'duration_ms': result.duration_ms,
                        'status': result.status,
                        'error_message': result.error_message,
                        'google_error_code': result.google_error_code,
                        'user_agent': result.user_agent,
                        'client_ip': result.client_ip,
                        'created_at': result.created_at.isoformat() if result.created_at else None,
                        'updated_at': result.updated_at.isoformat() if result.updated_at else None
                    }
                    logs.append(log_dict)

                return logs

            finally:
                session.close()

        except Exception as e:
            logger.error(f"❌ Error obteniendo logs de API calls: {e}")
            return []

    def get_api_call_by_id(self, call_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene un log específico por su ID

        Args:
            call_id: ID de la API call

        Returns:
            Diccionario con toda la información de la API call o None
        """
        try:
            session = get_database_session()
            try:
                api_call = session.query(GoogleApiCall).filter(GoogleApiCall.id == call_id).first()

                if not api_call:
                    return None

                return {
                    'id': api_call.id,
                    'operation_id': api_call.operation_id,
                    'api_type': api_call.api_type,
                    'endpoint': api_call.endpoint,
                    'method': api_call.method,
                    'request_headers': api_call.request_headers,
                    'request_body': api_call.request_body,
                    'request_params': api_call.request_params,
                    'response_status_code': api_call.response_status_code,
                    'response_headers': api_call.response_headers,
                    'response_body': api_call.response_body,
                    'request_timestamp': api_call.request_timestamp.isoformat() if api_call.request_timestamp else None,
                    'response_timestamp': api_call.response_timestamp.isoformat() if api_call.response_timestamp else None,
                    'duration_ms': api_call.duration_ms,
                    'status': api_call.status,
                    'error_message': api_call.error_message,
                    'google_error_code': api_call.google_error_code,
                    'user_agent': api_call.user_agent,
                    'client_ip': api_call.client_ip,
                    'created_at': api_call.created_at.isoformat() if api_call.created_at else None,
                    'updated_at': api_call.updated_at.isoformat() if api_call.updated_at else None
                }

            finally:
                session.close()

        except Exception as e:
            logger.error(f"❌ Error obteniendo API call {call_id}: {e}")
            return None

    def _filter_sensitive_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """
        Filtra headers sensibles como API keys

        Args:
            headers: Headers originales

        Returns:
            Headers filtrados sin información sensible
        """
        sensitive_keys = {
            'authorization', 'x-api-key', 'x-goog-api-key',
            'api-key', 'token', 'bearer', 'x-auth-token'
        }

        filtered = {}
        for key, value in headers.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                # Mantener solo los últimos 4 caracteres para debugging
                if len(value) > 4:
                    filtered[key] = f"***{value[-4:]}"
                else:
                    filtered[key] = "***"
            else:
                filtered[key] = value

        return filtered

# Instancia global del logger
google_api_logger = GoogleApiLogger()