from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from models.database import get_database_session
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import uuid
from pathlib import Path

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = get_database_session()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(prefix="/api/v1/branding", tags=["branding"])

class BrandingCreate(BaseModel):
    company_name: str
    slogan: Optional[str] = ""
    industry: Optional[str] = ""
    primary_color: Optional[str] = "#0066CC"
    secondary_color: Optional[str] = "#FF6600"
    accent_color: Optional[str] = "#00CC66"
    brand_style: Optional[str] = "professional"
    phone_number: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    default_cta: Optional[str] = ""
    brand_voice: Optional[str] = ""
    hashtags: Optional[List[str]] = []
    logo_url: Optional[str] = ""
    # 📍 Dirección
    street_address: Optional[str] = ""
    suite_apt: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    zip_code: Optional[str] = ""
    country: Optional[str] = "United States"
    # 📞 Contacto adicional
    fax: Optional[str] = ""
    toll_free_phone: Optional[str] = ""
    # 🕐 Horarios
    business_hours: Optional[dict] = None
    # 🎨 Visual
    icon_url: Optional[str] = ""
    # 🌍 Información adicional
    founded_year: Optional[int] = None
    languages: Optional[List[str]] = []
    service_areas: Optional[List[str]] = []
    # 🌐 Redes sociales
    facebook_url: Optional[str] = ""
    instagram_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    twitter_url: Optional[str] = ""

class BrandingUpdate(BaseModel):
    company_name: Optional[str] = None
    slogan: Optional[str] = None
    industry: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    brand_style: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    default_cta: Optional[str] = None
    brand_voice: Optional[str] = None
    hashtags: Optional[List[str]] = None
    logo_url: Optional[str] = None
    # 📍 Dirección
    street_address: Optional[str] = None
    suite_apt: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    # 📞 Contacto adicional
    fax: Optional[str] = None
    toll_free_phone: Optional[str] = None
    # 🕐 Horarios
    business_hours: Optional[dict] = None
    # 🎨 Visual
    icon_url: Optional[str] = None
    # 🌍 Información adicional
    founded_year: Optional[int] = None
    languages: Optional[List[str]] = None
    service_areas: Optional[List[str]] = None
    # 🌐 Redes sociales
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None

@router.get("/active")
async def get_active_branding(db: Session = Depends(get_db)):
    """Obtener branding corporativo activo"""
    try:
        branding = db.execute(text("""
            SELECT * FROM public.company_branding
            WHERE is_active = true
            LIMIT 1
        """)).fetchone()

        if not branding:
            return {
                "success": False,
                "message": "No active branding found",
                "branding": None
            }

        # Parsear hashtags si es un string JSON
        hashtags = []
        if branding.hashtags:
            try:
                if isinstance(branding.hashtags, str):
                    hashtags = json.loads(branding.hashtags)
                elif isinstance(branding.hashtags, list):
                    hashtags = branding.hashtags
            except:
                hashtags = [branding.hashtags] if branding.hashtags else []

        # Parsear business_hours si es JSON
        business_hours = None
        if branding.business_hours:
            try:
                if isinstance(branding.business_hours, str):
                    business_hours = json.loads(branding.business_hours)
                elif isinstance(branding.business_hours, dict):
                    business_hours = branding.business_hours
            except:
                business_hours = None

        # Parsear languages y service_areas si son arrays
        languages = []
        if branding.languages:
            try:
                if isinstance(branding.languages, list):
                    languages = branding.languages
                elif isinstance(branding.languages, str):
                    languages = json.loads(branding.languages)
            except:
                languages = [branding.languages] if branding.languages else []

        service_areas = []
        if branding.service_areas:
            try:
                if isinstance(branding.service_areas, list):
                    service_areas = branding.service_areas
                elif isinstance(branding.service_areas, str):
                    service_areas = json.loads(branding.service_areas)
            except:
                service_areas = [branding.service_areas] if branding.service_areas else []

        return {
            "success": True,
            "id": branding.id,
            "company_name": branding.company_name,
            "slogan": branding.slogan,
            "industry": branding.industry,
            "primary_color": branding.primary_color,
            "secondary_color": branding.secondary_color,
            "accent_color": branding.accent_color,
            "brand_style": branding.brand_style,
            "phone_number": branding.phone_number,
            "email": branding.email,
            "website": branding.website,
            "default_cta": branding.default_cta,
            "brand_voice": branding.brand_voice,
            "hashtags": hashtags,
            "logo_url": branding.logo_url,
            # 📍 Dirección
            "street_address": branding.street_address,
            "suite_apt": branding.suite_apt,
            "city": branding.city,
            "state": branding.state,
            "zip_code": branding.zip_code,
            "country": branding.country,
            # 📞 Contacto adicional
            "fax": branding.fax,
            "toll_free_phone": branding.toll_free_phone,
            # 🕐 Horarios
            "business_hours": business_hours,
            # 🎨 Visual
            "icon_url": branding.icon_url,
            # 🌍 Información adicional
            "founded_year": branding.founded_year,
            "languages": languages,
            "service_areas": service_areas,
            # 🌐 Redes sociales
            "facebook_url": branding.facebook_url,
            "instagram_url": branding.instagram_url,
            "linkedin_url": branding.linkedin_url,
            "twitter_url": branding.twitter_url,
            "is_active": branding.is_active,
            "created_at": branding.created_at.isoformat() if branding.created_at else None,
            "updated_at": branding.updated_at.isoformat() if branding.updated_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting active branding: {str(e)}")

@router.post("/create")
async def create_branding(branding_data: BrandingCreate, db: Session = Depends(get_db)):
    """Crear nuevo branding corporativo"""
    try:
        # Desactivar branding existente
        db.execute(text("""
            UPDATE public.company_branding
            SET is_active = false, updated_at = NOW()
            WHERE is_active = true
        """))

        # Crear nuevo branding
        result = db.execute(text("""
            INSERT INTO public.company_branding (
                company_name, slogan, industry, primary_color, secondary_color,
                accent_color, brand_style, phone_number, email, website,
                default_cta, brand_voice, hashtags, logo_url,
                street_address, suite_apt, city, state, zip_code, country,
                fax, toll_free_phone, business_hours, icon_url,
                founded_year, languages, service_areas,
                facebook_url, instagram_url, linkedin_url, twitter_url,
                is_active, created_at, updated_at
            ) VALUES (
                :company_name, :slogan, :industry, :primary_color, :secondary_color,
                :accent_color, :brand_style, :phone_number, :email, :website,
                :default_cta, :brand_voice, :hashtags, :logo_url,
                :street_address, :suite_apt, :city, :state, :zip_code, :country,
                :fax, :toll_free_phone, :business_hours, :icon_url,
                :founded_year, :languages, :service_areas,
                :facebook_url, :instagram_url, :linkedin_url, :twitter_url,
                true, NOW(), NOW()
            ) RETURNING id
        """), {
            "company_name": branding_data.company_name,
            "slogan": branding_data.slogan,
            "industry": branding_data.industry,
            "primary_color": branding_data.primary_color,
            "secondary_color": branding_data.secondary_color,
            "accent_color": branding_data.accent_color,
            "brand_style": branding_data.brand_style,
            "phone_number": branding_data.phone_number,
            "email": branding_data.email,
            "website": branding_data.website,
            "default_cta": branding_data.default_cta,
            "brand_voice": branding_data.brand_voice,
            "hashtags": '{' + ','.join([f'"{tag}"' for tag in branding_data.hashtags]) + '}' if branding_data.hashtags else '{}',
            "logo_url": branding_data.logo_url,
            # 📍 Dirección
            "street_address": branding_data.street_address,
            "suite_apt": branding_data.suite_apt,
            "city": branding_data.city,
            "state": branding_data.state,
            "zip_code": branding_data.zip_code,
            "country": branding_data.country,
            # 📞 Contacto adicional
            "fax": branding_data.fax,
            "toll_free_phone": branding_data.toll_free_phone,
            # 🕐 Horarios
            "business_hours": json.dumps(branding_data.business_hours) if branding_data.business_hours else None,
            # 🎨 Visual
            "icon_url": branding_data.icon_url,
            # 🌍 Información adicional
            "founded_year": branding_data.founded_year,
            "languages": '{' + ','.join([f'"{lang}"' for lang in branding_data.languages]) + '}' if branding_data.languages else '{}',
            "service_areas": '{' + ','.join([f'"{area}"' for area in branding_data.service_areas]) + '}' if branding_data.service_areas else '{}',
            # 🌐 Redes sociales
            "facebook_url": branding_data.facebook_url,
            "instagram_url": branding_data.instagram_url,
            "linkedin_url": branding_data.linkedin_url,
            "twitter_url": branding_data.twitter_url
        })

        new_id = result.fetchone()[0]
        db.commit()

        return {
            "success": True,
            "message": "Branding created successfully",
            "id": new_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating branding: {str(e)}")

@router.put("/active")
async def update_active_branding(branding_data: BrandingUpdate, db: Session = Depends(get_db)):
    """Actualizar branding corporativo activo"""
    try:
        # Obtener branding activo
        active_branding = db.execute(text("""
            SELECT id FROM public.company_branding
            WHERE is_active = true
            LIMIT 1
        """)).fetchone()

        if not active_branding:
            raise HTTPException(status_code=404, detail="No active branding found")

        # Construir query de actualización dinámicamente
        update_fields = []
        update_values = {"branding_id": active_branding.id}

        if branding_data.company_name is not None:
            update_fields.append("company_name = :company_name")
            update_values["company_name"] = branding_data.company_name

        if branding_data.slogan is not None:
            update_fields.append("slogan = :slogan")
            update_values["slogan"] = branding_data.slogan

        if branding_data.industry is not None:
            update_fields.append("industry = :industry")
            update_values["industry"] = branding_data.industry

        if branding_data.primary_color is not None:
            update_fields.append("primary_color = :primary_color")
            update_values["primary_color"] = branding_data.primary_color

        if branding_data.secondary_color is not None:
            update_fields.append("secondary_color = :secondary_color")
            update_values["secondary_color"] = branding_data.secondary_color

        if branding_data.accent_color is not None:
            update_fields.append("accent_color = :accent_color")
            update_values["accent_color"] = branding_data.accent_color

        if branding_data.brand_style is not None:
            update_fields.append("brand_style = :brand_style")
            update_values["brand_style"] = branding_data.brand_style

        if branding_data.phone_number is not None:
            update_fields.append("phone_number = :phone_number")
            update_values["phone_number"] = branding_data.phone_number

        if branding_data.email is not None:
            update_fields.append("email = :email")
            update_values["email"] = branding_data.email

        if branding_data.website is not None:
            update_fields.append("website = :website")
            update_values["website"] = branding_data.website

        if branding_data.default_cta is not None:
            update_fields.append("default_cta = :default_cta")
            update_values["default_cta"] = branding_data.default_cta

        if branding_data.brand_voice is not None:
            update_fields.append("brand_voice = :brand_voice")
            update_values["brand_voice"] = branding_data.brand_voice

        if branding_data.hashtags is not None:
            # Convertir lista Python a formato PostgreSQL array literal
            if isinstance(branding_data.hashtags, list) and len(branding_data.hashtags) > 0:
                hashtags_array = '{' + ','.join([f'"{tag}"' for tag in branding_data.hashtags]) + '}'
            else:
                hashtags_array = '{}'
            update_fields.append("hashtags = :hashtags")
            update_values["hashtags"] = hashtags_array

        if branding_data.logo_url is not None:
            update_fields.append("logo_url = :logo_url")
            update_values["logo_url"] = branding_data.logo_url

        # 📍 Dirección
        if branding_data.street_address is not None:
            update_fields.append("street_address = :street_address")
            update_values["street_address"] = branding_data.street_address

        if branding_data.suite_apt is not None:
            update_fields.append("suite_apt = :suite_apt")
            update_values["suite_apt"] = branding_data.suite_apt

        if branding_data.city is not None:
            update_fields.append("city = :city")
            update_values["city"] = branding_data.city

        if branding_data.state is not None:
            update_fields.append("state = :state")
            update_values["state"] = branding_data.state

        if branding_data.zip_code is not None:
            update_fields.append("zip_code = :zip_code")
            update_values["zip_code"] = branding_data.zip_code

        if branding_data.country is not None:
            update_fields.append("country = :country")
            update_values["country"] = branding_data.country

        # 📞 Contacto adicional
        if branding_data.fax is not None:
            update_fields.append("fax = :fax")
            update_values["fax"] = branding_data.fax

        if branding_data.toll_free_phone is not None:
            update_fields.append("toll_free_phone = :toll_free_phone")
            update_values["toll_free_phone"] = branding_data.toll_free_phone

        # 🕐 Horarios
        if branding_data.business_hours is not None:
            update_fields.append("business_hours = :business_hours")
            update_values["business_hours"] = json.dumps(branding_data.business_hours)

        # 🎨 Visual
        if branding_data.icon_url is not None:
            update_fields.append("icon_url = :icon_url")
            update_values["icon_url"] = branding_data.icon_url

        # 🌍 Información adicional
        if branding_data.founded_year is not None:
            update_fields.append("founded_year = :founded_year")
            update_values["founded_year"] = branding_data.founded_year

        if branding_data.languages is not None:
            # Convertir lista Python a formato PostgreSQL array literal
            if isinstance(branding_data.languages, list) and len(branding_data.languages) > 0:
                languages_array = '{' + ','.join([f'"{lang}"' for lang in branding_data.languages]) + '}'
            else:
                languages_array = '{}'
            update_fields.append("languages = :languages")
            update_values["languages"] = languages_array

        if branding_data.service_areas is not None:
            # Convertir lista Python a formato PostgreSQL array literal
            if isinstance(branding_data.service_areas, list) and len(branding_data.service_areas) > 0:
                service_areas_array = '{' + ','.join([f'"{area}"' for area in branding_data.service_areas]) + '}'
            else:
                service_areas_array = '{}'
            update_fields.append("service_areas = :service_areas")
            update_values["service_areas"] = service_areas_array

        # 🌐 Redes sociales
        if branding_data.facebook_url is not None:
            update_fields.append("facebook_url = :facebook_url")
            update_values["facebook_url"] = branding_data.facebook_url

        if branding_data.instagram_url is not None:
            update_fields.append("instagram_url = :instagram_url")
            update_values["instagram_url"] = branding_data.instagram_url

        if branding_data.linkedin_url is not None:
            update_fields.append("linkedin_url = :linkedin_url")
            update_values["linkedin_url"] = branding_data.linkedin_url

        if branding_data.twitter_url is not None:
            update_fields.append("twitter_url = :twitter_url")
            update_values["twitter_url"] = branding_data.twitter_url

        if not update_fields:
            return {
                "success": True,
                "message": "No changes to update"
            }

        # Agregar updated_at
        update_fields.append("updated_at = NOW()")

        # Ejecutar actualización
        query = f"""
            UPDATE public.company_branding
            SET {', '.join(update_fields)}
            WHERE id = :branding_id
        """

        db.execute(text(query), update_values)
        db.commit()

        return {
            "success": True,
            "message": "Branding updated successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating branding: {str(e)}")

@router.get("/list")
async def list_all_branding(db: Session = Depends(get_db)):
    """Listar todo el branding (activo e inactivo)"""
    try:
        branding_list = db.execute(text("""
            SELECT * FROM public.company_branding
            ORDER BY is_active DESC, created_at DESC
        """)).fetchall()

        branding_data = []
        for branding in branding_list:
            # Parsear hashtags
            hashtags = []
            if branding.hashtags:
                try:
                    if isinstance(branding.hashtags, str):
                        hashtags = json.loads(branding.hashtags)
                    elif isinstance(branding.hashtags, list):
                        hashtags = branding.hashtags
                except:
                    hashtags = [branding.hashtags] if branding.hashtags else []

            # Parsear business_hours, languages y service_areas para cada registro
            business_hours = None
            if branding.business_hours:
                try:
                    if isinstance(branding.business_hours, str):
                        business_hours = json.loads(branding.business_hours)
                    elif isinstance(branding.business_hours, dict):
                        business_hours = branding.business_hours
                except:
                    business_hours = None

            languages = []
            if branding.languages:
                try:
                    if isinstance(branding.languages, list):
                        languages = branding.languages
                    elif isinstance(branding.languages, str):
                        languages = json.loads(branding.languages)
                except:
                    languages = [branding.languages] if branding.languages else []

            service_areas = []
            if branding.service_areas:
                try:
                    if isinstance(branding.service_areas, list):
                        service_areas = branding.service_areas
                    elif isinstance(branding.service_areas, str):
                        service_areas = json.loads(branding.service_areas)
                except:
                    service_areas = [branding.service_areas] if branding.service_areas else []

            branding_data.append({
                "id": branding.id,
                "company_name": branding.company_name,
                "slogan": branding.slogan,
                "industry": branding.industry,
                "primary_color": branding.primary_color,
                "secondary_color": branding.secondary_color,
                "accent_color": branding.accent_color,
                "brand_style": branding.brand_style,
                "phone_number": branding.phone_number,
                "email": branding.email,
                "website": branding.website,
                "default_cta": branding.default_cta,
                "brand_voice": branding.brand_voice,
                "hashtags": hashtags,
                "logo_url": branding.logo_url,
                # 📍 Dirección
                "street_address": branding.street_address,
                "suite_apt": branding.suite_apt,
                "city": branding.city,
                "state": branding.state,
                "zip_code": branding.zip_code,
                "country": branding.country,
                # 📞 Contacto adicional
                "fax": branding.fax,
                "toll_free_phone": branding.toll_free_phone,
                # 🕐 Horarios
                "business_hours": business_hours,
                # 🎨 Visual
                "icon_url": branding.icon_url,
                # 🌍 Información adicional
                "founded_year": branding.founded_year,
                "languages": languages,
                "service_areas": service_areas,
                # 🌐 Redes sociales
                "facebook_url": branding.facebook_url,
                "instagram_url": branding.instagram_url,
                "linkedin_url": branding.linkedin_url,
                "twitter_url": branding.twitter_url,
                "is_active": branding.is_active,
                "created_at": branding.created_at.isoformat() if branding.created_at else None,
                "updated_at": branding.updated_at.isoformat() if branding.updated_at else None
            })

        return {
            "success": True,
            "branding": branding_data,
            "total": len(branding_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing branding: {str(e)}")

@router.delete("/active")
async def delete_active_branding(db: Session = Depends(get_db)):
    """Eliminar branding activo (soft delete)"""
    try:
        # Obtener branding activo
        active_branding = db.execute(text("""
            SELECT id FROM public.company_branding
            WHERE is_active = true
            LIMIT 1
        """)).fetchone()

        if not active_branding:
            raise HTTPException(status_code=404, detail="No active branding found")

        # Soft delete (desactivar)
        db.execute(text("""
            UPDATE public.company_branding
            SET is_active = false, updated_at = NOW()
            WHERE id = :branding_id
        """), {"branding_id": active_branding.id})

        db.commit()

        return {
            "success": True,
            "message": "Branding deleted successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting branding: {str(e)}")

@router.post("/upload-icon")
async def upload_icon(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Subir icono de la empresa"""
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos de imagen")

        # Validar tamaño (máximo 5MB)
        file_size = 0
        content = await file.read()
        file_size = len(content)

        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="El archivo es demasiado grande. Máximo 5MB")

        # Generar nombre único
        file_extension = Path(file.filename).suffix.lower()
        unique_filename = f"icon_{uuid.uuid4().hex}{file_extension}"

        # Crear directorio si no existe
        upload_dir = Path("/app/uploads/icons")
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Guardar archivo
        file_path = upload_dir / unique_filename
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Obtener branding activo
        active_branding = db.execute(text("""
            SELECT id FROM public.company_branding
            WHERE is_active = true
            LIMIT 1
        """)).fetchone()

        if not active_branding:
            # Si no hay branding activo, crear uno básico
            result = db.execute(text("""
                INSERT INTO public.company_branding (
                    company_name, is_active, icon_url, created_at, updated_at
                ) VALUES (
                    'Company', true, :icon_url, NOW(), NOW()
                ) RETURNING id
            """), {"icon_url": unique_filename})

            new_id = result.fetchone()[0]
            db.commit()

            return {
                "success": True,
                "message": "Icono subido y branding creado",
                "icon_url": unique_filename,
                "branding_id": new_id
            }
        else:
            # Actualizar branding existente
            db.execute(text("""
                UPDATE public.company_branding
                SET icon_url = :icon_url, updated_at = NOW()
                WHERE id = :branding_id
            """), {
                "icon_url": unique_filename,
                "branding_id": active_branding.id
            })

            db.commit()

            return {
                "success": True,
                "message": "Icono actualizado exitosamente",
                "icon_url": unique_filename,
                "branding_id": active_branding.id
            }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error subiendo icono: {str(e)}")
