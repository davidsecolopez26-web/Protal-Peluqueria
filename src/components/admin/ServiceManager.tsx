'use client'

import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  durationMinutes: number
  createdAt: string
}

export default function ServiceManager() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', durationMinutes: 0 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', durationMinutes: 30 })

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      setServices(data.services || [])
    } catch (err) {
      setError('Error cargando servicios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error creando servicio')
        return
      }

      setAddForm({ name: '', durationMinutes: 30 })
      setShowAddForm(false)
      fetchServices()
    } catch (err) {
      setError('Error creando servicio')
      console.error(err)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingId(service.id)
    setEditForm({ name: service.name, durationMinutes: service.durationMinutes })
  }

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error actualizando servicio')
        return
      }

      setEditingId(null)
      fetchServices()
    } catch (err) {
      setError('Error actualizando servicio')
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error eliminando servicio')
        return
      }

      fetchServices()
    } catch (err) {
      setError('Error eliminando servicio')
      console.error(err)
    }
  }

  if (loading) {
    return <div className="text-center p-4">Cargando...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Servicios</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancelar' : '+ Añadir Servicio'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
              <input
                type="number"
                value={addForm.durationMinutes}
                onChange={(e) => setAddForm({ ...addForm, durationMinutes: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border rounded-lg"
                min="1"
                max="480"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Servicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duración
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.id}>
                <td className="px-6 py-4">
                  {editingId === service.id ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    <span className="font-medium">{service.name}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === service.id ? (
                    <input
                      type="number"
                      value={editForm.durationMinutes}
                      onChange={(e) => setEditForm({ ...editForm, durationMinutes: parseInt(e.target.value) || 0 })}
                      className="w-24 p-2 border rounded"
                      min="1"
                      max="480"
                    />
                  ) : (
                    <span>{service.durationMinutes} min</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId === service.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveEdit(service.id)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(service)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay servicios. Añade el primero.
          </div>
        )}
      </div>
    </div>
  )
}