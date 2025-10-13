#!/usr/bin/env python3
"""
Script para inicializar la base de datos
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import create_tables
from utils.logger import setup_logger

logger = setup_logger(__name__)

def main():
    """Inicializar la base de datos"""
    try:
        logger.info("Iniciando creación de tablas...")
        create_tables()
        logger.info("✅ Base de datos inicializada correctamente")
    except Exception as e:
        logger.error(f"❌ Error inicializando base de datos: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()