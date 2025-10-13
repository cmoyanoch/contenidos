# 📋 Guía para Configurar App Review y pages_manage_posts

## 🎯 **Ruta Exacta en Facebook Developer Console**

### **1. Panel de Desarrolladores**
- **URL:** https://developers.facebook.com/apps/
- **Selecciona:** `marcia_uno`

### **2. App Review (Revisión de la aplicación)**
- **Ubicación:** Menú lateral izquierdo
- **Busca:** "App Review" o "Revisión de la aplicación"
- **Click:** En "App Review"

### **3. Permissions and Features (Permisos y funciones)**
- **Ubicación:** Dentro de App Review
- **Busca:** "Permissions and Features" o "Permisos y funciones"
- **Click:** En "Permissions and Features"

### **4. Buscar pages_manage_posts**
- **En la lista:** Busca `pages_manage_posts`
- **Si aparece:** Click "Request" o "Solicitar"
- **Si NO aparece:** Ver Paso 5

---

## 🔧 **Si pages_manage_posts NO aparece**

### **Opción A: Verificar Configuración Básica**
1. **Ve a:** "App Settings" > "Basic" (Configuración > Básica)
2. **Verifica que:**
   - ✅ App Name esté completo
   - ✅ App Contact Email esté configurado
   - ✅ App Domain esté configurado (puede ser localhost para desarrollo)

### **Opción B: Agregar Producto Pages**
1. **Ve a:** "App Settings" > "Basic"
2. **Busca:** "Add Product" o "Agregar producto"
3. **Selecciona:** "Pages" si no está agregado
4. **Guarda** la configuración

### **Opción C: Verificar Use Cases**
1. **Ve a:** "Use Cases" o "Casos de uso"
2. **Verifica que tengas:**
   - ✅ "Connect with customers through WhatsApp"
   - ✅ "Create and manage ads with Marketing API"
   - ✅ "Manage Pages" (si está disponible)

---

## 📝 **Información Requerida para la Solicitud**

### **Si encuentras pages_manage_posts y puedes solicitar:**

**Descripción del uso:**
```
Esta aplicación gestiona contenido para A Security Insurance Agency.
Necesitamos publicar actualizaciones de seguros, promociones y
contenido educativo para nuestros clientes en nuestra página de Facebook.

El permiso pages_manage_posts nos permite:
- Publicar actualizaciones de seguros
- Compartir promociones y ofertas
- Publicar contenido educativo sobre seguros
- Mantener a nuestros clientes informados
```

**Video/Screenshots requeridos:**
- Capturas de pantalla de la aplicación funcionando
- Video mostrando el flujo de publicación (opcional pero recomendado)

---

## 🚀 **Alternativas si no puedes obtener pages_manage_posts**

### **Opción 1: Usar Marketing API**
Tu app ya tiene `ads_management` y `pages_manage_ads`, podemos intentar publicar usando la Marketing API.

### **Opción 2: Configurar Webhooks**
Usar webhooks para automatizar publicaciones a través de otros medios.

### **Opción 3: Usar Facebook Business Manager**
Configurar publicaciones programadas directamente desde Facebook Business Manager.

---

## 📞 **Soporte Adicional**

Si después de seguir estos pasos no puedes encontrar o solicitar `pages_manage_posts`:

1. **Facebook Developer Support:** https://developers.facebook.com/support/
2. **Documentación oficial:** https://developers.facebook.com/docs/pages-api/
3. **Facebook Developer Community:** https://developers.facebook.com/community/

---

## ✅ **Checklist de Verificación**

- [ ] App configurada correctamente en Basic Settings
- [ ] Producto "Pages" agregado (si es necesario)
- [ ] Use Cases configurados apropiadamente
- [ ] App Review > Permissions and Features verificado
- [ ] pages_manage_posts solicitado (si está disponible)
- [ ] Información de solicitud completada
- [ ] Solicitud enviada para revisión

---

**Nota:** El proceso de revisión de Facebook puede tomar varios días. Mientras tanto, podemos explorar alternativas para hacer que tu API RRSS funcione.
