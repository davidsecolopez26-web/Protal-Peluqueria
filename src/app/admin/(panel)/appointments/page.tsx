'use client'

import { useEffect, useMemo, useState } from 'react'

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDateSpanish(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const month = MONTHS_ES[d.getMonth()]
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const dayOfWeek = DAYS_ES[d.getDay()]
  return `${dayOfWeek} ${day}/${month} ${hours}:${minutes}`
}

function toLocalDateYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalStartTimeISO(date: Date, timeHHmm: string): string {
  const [hhStr, mmStr] = timeHHmm.split(':')
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(hhStr).padStart(2, '0')
  const mm = String(mmStr).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:00`
}

interface Appointment {
  id: string
  token: string
  clientName: string
  clientPhone: string
  serviceIds: string[]
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

interface Service {
  id: string
  name: string
  durationMinutes: number
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const [modifyingId, setModifyingId] = useState<string | null>(null)
  const [modifyingTimes, setModifyingTimes] = useState<string[]>([])
  const [modifyingTime, setModifyingTime] = useState<string>('')
  const [modifyingLoading, setModifyingLoading] = useState(false)

  const modifyingAppointment = useMemo(() => {
    if (!modifyingId) return null
    return appointments.find(a => a.id === modifyingId) || null
  }, [appointments, modifyingId])

  const fetchAppointments = async (status?: string) => {
    try {
      let url = '/api/admin/appointments'
      if (status && status !== 'all') {
        url += `?status=${status}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch (err) {
      console.error('Error fetching appointments:', err)
    }
  }

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchAppointments()
    fetchServices()
    setLoading(false)
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'confirmed':
        return 'Confirmada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getServiceNames = (serviceIds: string[]) => {
    return serviceIds
      .map(id => services.find(s => s.id === id)?.name || id)
      .join(', ')
  }

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      })
      if (res.ok) {
        fetchAppointments(filterStatus === 'all' ? undefined : filterStatus)
      }
    } catch (err) {
      console.error('Error confirming appointment:', err)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (res.ok) {
        fetchAppointments(filterStatus === 'all' ? undefined : filterStatus)
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err)
    }
  }

  const openModify = async (appt: Appointment) => {
    setModifyingId(appt.id)
    setModifyingTimes([])
    setModifyingTime('')
    setModifyingLoading(true)

    try {
      const start = new Date(appt.startTime)
      const date = toLocalDateYMD(start)
      const servicesParam = appt.serviceIds.join(',')

      const res = await fetch(
        `/api/appointments/available?date=${date}&services=${encodeURIComponent(servicesParam)}&step=30`
      )

      if (res.ok) {
        const data = await res.json()
        const times: string[] = data.availableTimes || []
        setModifyingTimes(times)
        setModifyingTime(times[0] || '')
      }
    } catch (err) {
      console.error('Error loading available times:', err)
    } finally {
      setModifyingLoading(false)
    }
  }

  const closeModify = () => {
    setModifyingId(null)
    setModifyingTimes([])
    setModifyingTime('')
    setModifyingLoading(false)
  }

  const submitModify = async () => {
    if (!modifyingAppointment || !modifyingTime) return

    try {
      const start = new Date(modifyingAppointment.startTime)
      const startTime = toLocalStartTimeISO(start, modifyingTime)

      const res = await fetch(`/api/admin/appointments/${modifyingAppointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime }),
      })

      if (res.ok) {
        closeModify()
        fetchAppointments(filterStatus === 'all' ? undefined : filterStatus)
      }
    } catch (err) {
      console.error('Error modifying appointment:', err)
    }
  }

  if (loading) {
    return <div className="text-center p-4">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Citas</h1>
        <select
          value={filterStatus}
          onChange={e => {
            setFilterStatus(e.target.value)
            fetchAppointments(e.target.value)
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        >
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="confirmed">Confirmadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No hay citas</div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Servicios</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Fecha y hora</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {appointments.map(appt => (
                <tr key={appt.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{appt.clientName}</div>
                    <div className="text-xs text-zinc-500">{appt.clientPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{getServiceNames(appt.serviceIds)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatDateSpanish(appt.startTime)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(appt.status)}`}
                    >
                      {statusLabel(appt.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {appt.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleConfirm(appt.id)}
                          className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleCancel(appt.id)}
                          className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => openModify(appt)}
                          className="px-3 py-1 text-xs font-medium bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Modificar
                        </button>
                      </div>
                    )}
                    {appt.status !== 'pending' && (
                      <div className="text-xs text-zinc-500">—</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modifyingId && modifyingAppointment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Modificar cita</h2>
                <div className="text-xs text-zinc-500 mt-1">
                  {modifyingAppointment.clientName} · {formatDateSpanish(modifyingAppointment.startTime)}
                </div>
              </div>
              <button
                onClick={closeModify}
                className="px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Elige nueva hora</div>
                <div className="text-xs text-zinc-500 mt-1">Se calculará el fin automáticamente según los servicios.</div>
              </div>

              {modifyingLoading ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Cargando horarios...</div>
              ) : modifyingTimes.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">No hay horarios disponibles para esta fecha.</div>
              ) : (
                <select
                  value={modifyingTime}
                  onChange={e => setModifyingTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  {modifyingTimes.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeModify}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitModify}
                  disabled={!modifyingTime || modifyingLoading}
                  className="px-3 py-2 text-sm font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
