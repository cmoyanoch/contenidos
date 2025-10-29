from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from models.database import get_database_session
from typing import List
from pathlib import Path
import json

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = get_database_session()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(prefix="/api/v1/staff", tags=["staff"])

@router.get("/list", response_model=dict)
async def list_all_staff(db: Session = Depends(get_db)):
    """Listar todo el staff activo"""
    try:
        staff_list = db.execute(text("""
            SELECT
                se.id,
                se.name,
                se.position,
                se.original_image_url,
                se.image_url_1,
                se.image_url_2,
                se.is_active,
                se.created_at,
                se.updated_at
            FROM api_google.staff_employee se
            WHERE se.is_active = true
            ORDER BY se.name, se.created_at
        """)).fetchall()

        staff_data = []
        for staff in staff_list:
            staff_data.append({
                "id": staff.id,
                "name": staff.name,
                "position": staff.position,
                "original_image_url": staff.original_image_url,
                "image_url_1": staff.image_url_1,
                "image_url_2": staff.image_url_2,
                "is_active": staff.is_active,
                "created_at": staff.created_at.isoformat() if staff.created_at else None,
                "updated_at": staff.updated_at.isoformat() if staff.updated_at else None
            })

        return {
            "success": True,
            "staff": staff_data,
            "total": len(staff_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing staff: {str(e)}")

@router.get("/random-simple", response_model=dict)
async def get_random_staff_simple(db: Session = Depends(get_db)):
    """
    Obtiene un empleado del staff de forma ALEATORIA.

    **Endpoint SIN autenticación para uso en N8N.**

    **Ejemplo:**
    ```
    GET /api/v1/staff/random-simple
    ```

    **Respuesta:**
    ```json
    {
      "success": true,
      "employee": {
        "id": 20,
        "name": "Marcia da Silva",
        "position": "Agent",
        "original_image_url": "original/86229.png",
        "image_url_1": "avatar/generated_image_1760643996054.png",
        "image_url_2": null,
        "is_active": true,
        "created_at": "2025-10-15T07:15:43.996000"
      }
    }
    ```
    """
    try:
        # Obtener empleado aleatorio
        employee = db.execute(text("""
            SELECT
                se.id,
                se.name,
                se.position,
                se.original_image_url,
                se.image_url_1,
                se.image_url_2,
                se.is_active,
                se.created_at,
                se.updated_at
            FROM api_google.staff_employee se
            WHERE se.is_active = true
            ORDER BY RANDOM()
            LIMIT 1
        """)).fetchone()

        if not employee:
            return {
                "success": False,
                "message": "No hay empleados activos",
                "employee": None
            }

        return {
            "success": True,
            "employee": {
                "id": employee.id,
                "name": employee.name,
                "position": employee.position,
                "original_image_url": employee.original_image_url,
                "image_url_1": employee.image_url_1,
                "image_url_2": employee.image_url_2,
                "is_active": employee.is_active,
                "created_at": employee.created_at.isoformat() if employee.created_at else None,
                "updated_at": employee.updated_at.isoformat() if employee.updated_at else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo empleado aleatorio: {str(e)}")

@router.get("/random-with-analysis", response_model=dict)
async def get_random_staff_with_analysis(
    content_type: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene un empleado del staff de forma ALEATORIA con análisis físico completo.

    **Endpoint SIN autenticación para uso en N8N.**

    **Parámetros:**
    - content_type (obligatorio): Tipo de contenido ("video_person", "video_avatar", "cta_post", etc.)

    **Lógica de selección de imagen:**
    - Si content_type = "video_avatar" → retorna image_url_1 (avatar 3D)
    - Para cualquier otro content_type → retorna image_url_2 (foto realista) [DEFAULT]

    **Ejemplo:**
    ```
    GET /api/v1/staff/random-with-analysis?content_type=video_person
    ```

    **Respuesta:**
    ```json
    {
      "success": true,
      "employee": {
        "id": 24,
        "name": "Raphaela Costa",
        "position": "Insurance agent",
        "image": "realistic/generated_image_xxx.png",
        "description": {
          "physical": {
            "gender": "female",
            "age_range": "40s",
            "hair": {...},
            "eyes": {...}
          },
          "prompt_templates": {...}
        }
      }
    }
    ```
    """
    try:
        # Obtener empleado aleatorio CON description
        employee = db.execute(text("""
            SELECT
                se.id,
                se.name,
                se.position,
                se.image_url_1,
                se.image_url_2,
                se.description
            FROM api_google.staff_employee se
            WHERE se.is_active = true
            ORDER BY RANDOM()
            LIMIT 1
        """)).fetchone()

        if not employee:
            return {
                "success": False,
                "message": "No hay empleados activos",
                "employee": None
            }

        # ✅ LÓGICA DE SELECCIÓN DE IMAGEN SEGÚN content_type
        if content_type == "video_avatar":
            selected_image = employee.image_url_1  # Avatar 3D
        else:
            # Para "video_person", "cta_post" y cualquier otro tipo
            selected_image = employee.image_url_2  # Foto realista (DEFAULT)

        # Parsear description como JSON object
        try:
            import json
            description_obj = json.loads(employee.description) if employee.description else {}
        except (json.JSONDecodeError, TypeError):
            description_obj = {}

        return {
            "success": True,
            "employee": {
                "id": employee.id,
                "name": employee.name,
                "position": employee.position,
                "image": selected_image,  # ✅ CAMPO ÚNICO CON IMAGEN SELECCIONADA
                "description": description_obj,  # ✅ DEVUELVE COMO OBJETO JSON
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo empleado aleatorio: {str(e)}")

@router.get("/random-by-content-type", response_model=dict)
async def get_random_staff_by_content_type(
    content_type: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene un empleado del staff de forma ALEATORIA con UN SOLO campo image_url
    basado en el content_type.

    **Endpoint SIN autenticación para uso en N8N.**

    **Parámetros:**
    - content_type: "video_person" | "video_avatar" | "cta_post" | etc.

    **Lógica de selección (basada en BD de formatos):**
    - Si content_type = "video_person" o "cta_post" → image_url = image_url_2 (realista)
    - Si content_type = "video_avatar" → image_url = image_url_1 (avatar)

    **Ejemplo:**
    ```
    GET /api/v1/staff/random-by-content-type?content_type=video_person
    ```

    **Respuesta:**
    ```json
    {
      "success": true,
      "employee": {
        "id": 24,
        "name": "Raphaela Costa",
        "position": "Insurance agent",
        "image_url": "realistic/generated_image_xxx.png",
        "description": "{\"physical\": {...}, \"prompt_templates\": {...}}",
        "is_active": true
      }
    }
    ```
    """
    try:
        # Obtener empleado aleatorio CON description
        employee = db.execute(text("""
            SELECT
                se.id,
                se.name,
                se.position,
                se.original_image_url,
                se.image_url_1,  -- Avatar
                se.image_url_2,  -- Realista
                se.description,
                se.is_active,
                se.created_at,
                se.updated_at
            FROM api_google.staff_employee se
            WHERE se.is_active = true
            ORDER BY RANDOM()
            LIMIT 1
        """)).fetchone()

        if not employee:
            return {
                "success": False,
                "message": "No hay empleados activos",
                "employee": None
            }

        # ✅ LÓGICA DE SELECCIÓN DE IMAGEN (basada en BD de formatos)
        if content_type == "video_person" or content_type == "cta_post":
            selected_image_url = employee.image_url_2  # Realista (Real Person)
        else:
            selected_image_url = employee.image_url_1  # Avatar

        return {
            "success": True,
            "employee": {
                "id": employee.id,
                "name": employee.name,
                "position": employee.position,
                "image_url": selected_image_url,  # ✅ UN SOLO CAMPO
                "description": employee.description,
                "is_active": employee.is_active,
                "created_at": employee.created_at.isoformat() if employee.created_at else None,
                "updated_at": employee.updated_at.isoformat() if employee.updated_at else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo empleado aleatorio: {str(e)}")


@router.get("/random", response_model=dict)
async def get_random_staff(
    content_type: str = None,
    character_style: str = None,
    db: Session = Depends(get_db)
):
    """Obtener staff aleatorio con formato asociado"""
    try:
        # Determinar estilo de caracter según content_type
        if content_type == "video_person":
            preferred_style = "realistic"
        elif content_type == "video_avatar":
            preferred_style = "pixar"
        else:
            preferred_style = character_style or "realistic"

        # Consulta para obtener staff con formato
        staff = db.execute(text("""
            SELECT
                se.id as employee_id,
                se.name,
                se.image_url_1,
                se.image_url_2,
                sf.id as format_id,
                sf.character_style,
                sf.imageprompt
            FROM api_google.staff_employee se
            JOIN api_google.staff_format sf ON sf.character_style = :preferred_style
            WHERE se.is_active = true
            AND sf.is_active = true
            ORDER BY RANDOM()
            LIMIT 1
        """), {"preferred_style": preferred_style}).fetchone()

        if not staff:
            raise HTTPException(status_code=404, detail="No active staff found")

        return {
            "success": True,
            "employee_id": staff.employee_id,
            "name": staff.name,
            "image_url_1": staff.image_url_1,
            "image_url_2": staff.image_url_2,
            "format_id": staff.format_id,
            "character_style": staff.character_style,
            "imageprompt": staff.imageprompt
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting random staff: {str(e)}")

@router.get("/{staff_id}", response_model=dict)
async def get_staff_by_id(staff_id: int, db: Session = Depends(get_db)):
    """Obtener staff por ID"""
    try:
        staff = db.execute(text("""
            SELECT
                se.id,
                se.name,
                se.image_url_1,
                se.image_url_2,
                se.is_active,
                se.created_at,
                se.updated_at
            FROM api_google.staff_employee se
            WHERE se.id = :staff_id
        """), {"staff_id": staff_id}).fetchone()

        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        return {
            "success": True,
            "staff": {
                "id": staff.id,
                "name": staff.name,
                "image_url_1": staff.image_url_1,
                "image_url_2": staff.image_url_2,
                "is_active": staff.is_active,
                "created_at": staff.created_at.isoformat() if staff.created_at else None,
                "updated_at": staff.updated_at.isoformat() if staff.updated_at else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting staff: {str(e)}")

@router.put("/{staff_id}/toggle", response_model=dict)
async def toggle_staff_status(staff_id: int, db: Session = Depends(get_db)):
    """Activar/desactivar staff"""
    try:
        # Obtener estado actual
        staff = db.execute(text("""
            SELECT is_active FROM api_google.staff_employee
            WHERE id = :staff_id
        """), {"staff_id": staff_id}).fetchone()

        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        # Cambiar estado
        new_status = not staff.is_active
        db.execute(text("""
            UPDATE api_google.staff_employee
            SET is_active = :new_status, updated_at = NOW()
            WHERE id = :staff_id
        """), {"staff_id": staff_id, "new_status": new_status})

        db.commit()

        return {
            "success": True,
            "message": f"Staff {'activated' if new_status else 'deactivated'} successfully",
            "is_active": new_status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error toggling staff status: {str(e)}")

@router.delete("/{staff_id}", response_model=dict)
async def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    """Eliminar staff (soft delete)"""
    try:
        # Verificar que existe
        staff = db.execute(text("""
            SELECT id FROM api_google.staff_employee
            WHERE id = :staff_id
        """), {"staff_id": staff_id}).fetchone()

        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        # Soft delete (desactivar)
        db.execute(text("""
            UPDATE api_google.staff_employee
            SET is_active = false, updated_at = NOW()
            WHERE id = :staff_id
        """), {"staff_id": staff_id})

        db.commit()

        return {
            "success": True,
            "message": "Staff member deleted successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting staff: {str(e)}")
