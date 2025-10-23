'use client'

import { Building2, Palette, Plus, Trash2, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useHydration } from '../../hooks/use-hydration';
import { buildApiUrl, buildIconUrl, buildN8nWebhookUrl, buildUploadUrl, config } from '../../lib/config';

interface StaffEmployee {
  id: number
  name: string
  position?: string
  original_image_url?: string
  image_url_1: string
  image_url_2: string
  is_active: boolean
  created_at: string
}

interface CompanyBranding {
  id: number
  company_name: string
  slogan: string
  industry: string
  primary_color: string
  secondary_color: string
  accent_color: string
  brand_style: string
  phone_number: string
  email: string
  website: string
  default_cta: string
  brand_voice: string
  hashtags: string[]
  logo_url?: string
  // 📍 Dirección
  street_address?: string
  suite_apt?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  // 📞 Contacto adicional
  fax?: string
  toll_free_phone?: string
  // 🕐 Horarios
  business_hours?: any
  // 🎨 Visual
  icon_url?: string
  // 🌍 Información adicional
  founded_year?: number
  languages?: string[]
  service_areas?: string[]
  // 🌐 Redes sociales
  facebook_url?: string
  instagram_url?: string
  linkedin_url?: string
  twitter_url?: string
  is_active: boolean
}

export default function CompanyPage() {
  // ✅ Hook de hidratación para prevenir errores de hidratación
  const isHydrated = useHydration()

  const [activeTab, setActiveTab] = useState<'staff' | 'branding'>('staff')
  const [staff, setStaff] = useState<StaffEmployee[]>([])
  const [branding, setBranding] = useState<CompanyBranding | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateStaff, setShowCreateStaff] = useState(false)
  const [showCreateBranding, setShowCreateBranding] = useState(false)
  const [iconFile, setIconFile] = useState<File | null>(null)

  // Estados para formulario de staff
  const [staffForm, setStaffForm] = useState({
    name: '',
    position: '',
    image: null as File | null
  })

  // Estados para formulario de branding
  const [brandingForm, setBrandingForm] = useState({
    company_name: '',
    slogan: '',
    industry: '',
    primary_color: '#0066CC',
    secondary_color: '#FF6600',
    accent_color: '#00CC66',
    brand_style: 'professional',
    phone_number: '',
    email: '',
    website: '',
    default_cta: '',
    brand_voice: '',
    hashtags: '',
    logo_url: '',
    // 📍 Dirección
    street_address: '',
    suite_apt: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    // 📞 Contacto adicional
    fax: '',
    toll_free_phone: '',
    // 🕐 Horarios
    business_hours: {
      monday: '9:00am-6:00pm',
      tuesday: '9:00am-6:00pm',
      wednesday: '9:00am-6:00pm',
      thursday: '9:00am-6:00pm',
      friday: '9:00am-6:00pm',
      saturday: 'Closed',
      sunday: 'Closed'
    },
    // 🎨 Visual
    icon_url: '',
    // 🌍 Información adicional
    founded_year: '',
    languages: '',
    service_areas: '',
    // 🌐 Redes sociales
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    twitter_url: ''
  })

  // Cargar staff existente
  const loadStaff = async () => {
    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/api/v1/staff/list'))
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar branding existente
  const loadBranding = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/v1/branding/active'))
      if (response.ok) {
        const data = await response.json()
        setBranding(data)
      }
    } catch (error) {
      console.error('Error loading branding:', error)
    }
  }

  // Crear nuevo staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!staffForm.name || !staffForm.position || !staffForm.image) {
      alert('Please complete all fields')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('data', staffForm.image)
      formData.append('nombre', staffForm.name)
      formData.append('cargo', staffForm.position)

      const response = await fetch(buildN8nWebhookUrl(config.webhooks.staff), {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        alert('Staff created successfully')
        setStaffForm({ name: '', position: '', image: null })
        setShowCreateStaff(false)
        loadStaff() // Recargar la lista
      } else {
        alert('Error creating staff')
      }
    } catch (error) {
      console.error('Error creating staff:', error)
      alert('Error creating staff')
    } finally {
      setLoading(false)
    }
  }

  // Eliminar staff
  const handleDeleteStaff = async (staffId: number, staffName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${staffName}?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl(`/api/v1/staff/${staffId}`), {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Staff deleted successfully')
        loadStaff() // Recargar la lista
      } else {
        alert('Error deleting staff')
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('Error deleting staff')
    } finally {
      setLoading(false)
    }
  }

  // Crear/actualizar branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const brandingData = {
        ...brandingForm,
        hashtags: brandingForm.hashtags.split(',').map(tag => tag.trim()).filter(Boolean),
        languages: brandingForm.languages.split(',').map(lang => lang.trim()).filter(Boolean),
        service_areas: brandingForm.service_areas.split(',').map(area => area.trim()).filter(Boolean),
        founded_year: brandingForm.founded_year ? parseInt(brandingForm.founded_year) : null
      }

      const response = await fetch(buildApiUrl('/api/v1/branding/active'), {
        method: branding ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brandingData),
      })

      if (response.ok) {
        alert('Branding saved successfully')
        setShowCreateBranding(false)
        loadBranding() // Recargar branding
      } else {
        alert('Error saving branding')
      }
    } catch (error) {
      console.error('Error saving branding:', error)
      alert('Error saving branding')
    } finally {
      setLoading(false)
    }
  }

  // Manejar upload de icono
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum 5MB')
      return
    }

    try {
      setLoading(true)
      setIconFile(file)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(buildApiUrl('/api/v1/branding/upload-icon'), {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setBrandingForm({ ...brandingForm, icon_url: data.icon_url })
        alert('Icon uploaded successfully')
        loadBranding() // Recargar branding para mostrar el nuevo icono
      } else {
        const errorData = await response.json()
        alert(`Error uploading icon: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading icon:', error)
      alert('Error uploading icon')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // ✅ Solo cargar datos después de la hidratación
    if (isHydrated) {
      loadStaff()
      loadBranding()
    }
  }, [isHydrated])

  // Cargar datos existentes en el formulario de branding
  useEffect(() => {
    if (branding) {
      setBrandingForm({
        company_name: branding.company_name || '',
        slogan: branding.slogan || '',
        industry: branding.industry || '',
        primary_color: branding.primary_color || '#0066CC',
        secondary_color: branding.secondary_color || '#FF6600',
        accent_color: branding.accent_color || '#00CC66',
        brand_style: branding.brand_style || 'professional',
        phone_number: branding.phone_number || '',
        email: branding.email || '',
        website: branding.website || '',
        default_cta: branding.default_cta || '',
        brand_voice: branding.brand_voice || '',
        hashtags: branding.hashtags?.join(', ') || '',
        logo_url: branding.logo_url || '',
        // 📍 Dirección
        street_address: branding.street_address || '',
        suite_apt: branding.suite_apt || '',
        city: branding.city || '',
        state: branding.state || '',
        zip_code: branding.zip_code || '',
        country: branding.country || 'United States',
        // 📞 Contacto adicional
        fax: branding.fax || '',
        toll_free_phone: branding.toll_free_phone || '',
        // 🕐 Horarios
        business_hours: branding.business_hours || {
          monday: '9:00am-6:00pm',
          tuesday: '9:00am-6:00pm',
          wednesday: '9:00am-6:00pm',
          thursday: '9:00am-6:00pm',
          friday: '9:00am-6:00pm',
          saturday: 'Closed',
          sunday: 'Closed'
        },
        // 🎨 Visual
        icon_url: branding.icon_url || '',
        // 🌍 Información adicional
        founded_year: branding.founded_year?.toString() || '',
        languages: branding.languages?.join(', ') || '',
        service_areas: branding.service_areas?.join(', ') || '',
        // 🌐 Redes sociales
        facebook_url: branding.facebook_url || '',
        instagram_url: branding.instagram_url || '',
        linkedin_url: branding.linkedin_url || '',
        twitter_url: branding.twitter_url || ''
      })
    }
  }, [branding])

  // ✅ Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
      {/* Header */}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
            </div>
          </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8 gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Staff Management
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'branding'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Palette className="w-5 h-5 inline mr-2" />
            Company Branding
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Header con botón crear */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Staff Members</h2>
              <button
                onClick={() => setShowCreateStaff(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Staff
              </button>
            </div>

            {/* Lista de Staff */}
            <div className="bg-white rounded-lg shadow-sm">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading staff...</p>
                </div>
              ) : staff.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No staff members found</p>
                  <p className="text-sm">Create your first staff member to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {staff.map((employee) => (
                    <div key={employee.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          {/* Imagen Original */}
                          <img
                            src={employee.original_image_url
                              ? buildUploadUrl(employee.original_image_url)
                              : buildUploadUrl(employee.image_url_1)
                            }
                            alt={employee.name}
                            className="w-32 h-48 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement
                              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="%23E5E7EB" width="96" height="96"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239CA3AF" font-family="sans-serif" font-size="14">Sin foto</text></svg>'
                            }}
                          />

                          {/* Información del Empleado */}
                          <div>
                            <h3 className="text-2xl font-semibold text-gray-900 mb-1">
                              {employee.name}
                            </h3>
                            <p className="text-lg text-gray-600">
                              {employee.position || 'Sin cargo asignado'}
                            </p>
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleDeleteStaff(employee.id, employee.name)}
                          className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete staff"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            {/* Header con botón crear/editar */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Company Branding</h2>
              <button
                onClick={() => setShowCreateBranding(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                {branding ? 'Edit Branding' : 'Create Branding'}
              </button>
            </div>

            {/* Vista actual del branding */}
            {branding && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Current Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Company Information</h4>
                    <p className="text-gray-600 mb-1"><strong>Name:</strong> {branding.company_name}</p>
                    <p className="text-gray-600 mb-1"><strong>Slogan:</strong> {branding.slogan}</p>
                    <p className="text-gray-600 mb-1"><strong>Industry:</strong> {branding.industry}</p>
                    <p className="text-gray-600 mb-1"><strong>Phone:</strong> {branding.phone_number}</p>
                    <p className="text-gray-600 mb-1"><strong>Email:</strong> {branding.email}</p>
                    <p className="text-gray-600"><strong>Website:</strong> {branding.website}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Brand Colors</h4>
                    <div className="flex space-x-4 mb-4">
                      <div className="text-center">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-200"
                          style={{ backgroundColor: branding.primary_color }}
                        ></div>
                        <p className="text-xs mt-1 text-gray-600">Primary</p>
                      </div>
                      <div className="text-center">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-200"
                          style={{ backgroundColor: branding.secondary_color }}
                        ></div>
                        <p className="text-xs mt-1 text-gray-600">Secondary</p>
                      </div>
                      <div className="text-center">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-200"
                          style={{ backgroundColor: branding.accent_color }}
                        ></div>
                        <p className="text-xs mt-1 text-gray-600">Accent</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-1"><strong>CTA:</strong> {branding.default_cta}</p>
                    <p className="text-gray-600"><strong>Voice:</strong> {branding.brand_voice}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {!branding && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Palette className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No branding configuration found</p>
                <p className="text-sm text-gray-400">Create your company branding to get started</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Crear Staff */}
      {showCreateStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Create New Staff Member</h3>
            <form onSubmit={handleCreateStaff}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo *
                  </label>
                  <input
                    type="text"
                    value={staffForm.position}
                    onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Ej: Insurance Agent, CEO, Marketing Manager"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto del Empleado *
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => setStaffForm({ ...staffForm, image: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Esta foto será procesada para generar versiones realistic y avatar
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateStaff(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Branding */}
      {showCreateBranding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              {branding ? 'Edit Company Branding' : 'Create Company Branding'}
            </h3>
            <form onSubmit={handleSaveBranding}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={brandingForm.company_name}
                    onChange={(e) => setBrandingForm({ ...brandingForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slogan
                  </label>
                  <input
                    type="text"
                    value={brandingForm.slogan}
                    onChange={(e) => setBrandingForm({ ...brandingForm, slogan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={brandingForm.industry}
                    onChange={(e) => setBrandingForm({ ...brandingForm, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={brandingForm.phone_number}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={brandingForm.email}
                    onChange={(e) => setBrandingForm({ ...brandingForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={brandingForm.website}
                    onChange={(e) => setBrandingForm({ ...brandingForm, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={brandingForm.primary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={brandingForm.secondary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={brandingForm.accent_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, accent_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Style
                  </label>
                  <select
                    value={brandingForm.brand_style}
                    onChange={(e) => setBrandingForm({ ...brandingForm, brand_style: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="modern">Modern</option>
                    <option value="traditional">Traditional</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default CTA
                  </label>
                  <textarea
                    value={brandingForm.default_cta}
                    onChange={(e) => setBrandingForm({ ...brandingForm, default_cta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Voice
                  </label>
                  <textarea
                    value={brandingForm.brand_voice}
                    onChange={(e) => setBrandingForm({ ...brandingForm, brand_voice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hashtags (separated by commas)
                  </label>
                  <input
                    type="text"
                    value={brandingForm.hashtags}
                    onChange={(e) => setBrandingForm({ ...brandingForm, hashtags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="#Seguros #Finanzas #Protección"
                  />
                </div>

                {/* 📍 SECCIÓN DIRECCIÓN */}
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">📍 Address Information</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={brandingForm.street_address}
                    onChange={(e) => setBrandingForm({ ...brandingForm, street_address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="23257 State Road 7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suite/Apt
                  </label>
                  <input
                    type="text"
                    value={brandingForm.suite_apt}
                    onChange={(e) => setBrandingForm({ ...brandingForm, suite_apt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Suite 201"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={brandingForm.city}
                    onChange={(e) => setBrandingForm({ ...brandingForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Boca Raton"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={brandingForm.state}
                    onChange={(e) => setBrandingForm({ ...brandingForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Florida"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={brandingForm.zip_code}
                    onChange={(e) => setBrandingForm({ ...brandingForm, zip_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="33428"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={brandingForm.country}
                    onChange={(e) => setBrandingForm({ ...brandingForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="United States"
                  />
                </div>

                {/* 📞 SECCIÓN CONTACTO ADICIONAL */}
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">📞 Additional Contact Information</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fax
                  </label>
                  <input
                    type="text"
                    value={brandingForm.fax}
                    onChange={(e) => setBrandingForm({ ...brandingForm, fax: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="(561) 487-5135"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Toll Free Phone
                  </label>
                  <input
                    type="text"
                    value={brandingForm.toll_free_phone}
                    onChange={(e) => setBrandingForm({ ...brandingForm, toll_free_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="(888) 930-7822"
                  />
                </div>

                {/* 🌍 SECCIÓN INFORMACIÓN ADICIONAL */}
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">🌍 Additional Information</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Founded Year
                  </label>
                  <input
                    type="number"
                    value={brandingForm.founded_year}
                    onChange={(e) => setBrandingForm({ ...brandingForm, founded_year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="2006"
                    min="1900"
                    max="2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages (separated by commas)
                  </label>
                  <input
                    type="text"
                    value={brandingForm.languages}
                    onChange={(e) => setBrandingForm({ ...brandingForm, languages: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="English, Portuguese, Spanish"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Areas (separated by commas)
                  </label>
                  <input
                    type="text"
                    value={brandingForm.service_areas}
                    onChange={(e) => setBrandingForm({ ...brandingForm, service_areas: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Boca Raton, Deerfield Beach, Pompano Beach, Fort Lauderdale"
                  />
                </div>

                {/* 🌐 SECCIÓN REDES SOCIALES */}
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">🌐 Social Media</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    value={brandingForm.facebook_url}
                    onChange={(e) => setBrandingForm({ ...brandingForm, facebook_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="https://www.facebook.com/asecagency"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={brandingForm.instagram_url}
                    onChange={(e) => setBrandingForm({ ...brandingForm, instagram_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="https://www.instagram.com/asecagency"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={brandingForm.linkedin_url}
                    onChange={(e) => setBrandingForm({ ...brandingForm, linkedin_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="https://www.linkedin.com/company/asecagency"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitter URL
                  </label>
                  <input
                    type="url"
                    value={brandingForm.twitter_url}
                    onChange={(e) => setBrandingForm({ ...brandingForm, twitter_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="https://www.twitter.com/asecagency"
                  />
                </div>

                {/* 🎨 SECCIÓN VISUAL ASSETS */}
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">🎨 Visual Assets</h4>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Icon
                  </label>

                  {/* Preview del icono actual - solo si existe */}
                  {brandingForm.icon_url && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Current Icon:</p>
                      <img
                        src={buildIconUrl(brandingForm.icon_url)}
                        alt="Company Icon"
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Input de archivo */}
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    />
                    <p className="text-xs text-gray-500">
                      Upload an icon for your company (PNG, JPG, GIF - max 5MB)
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateBranding(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
