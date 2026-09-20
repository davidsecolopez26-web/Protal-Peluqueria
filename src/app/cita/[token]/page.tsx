'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import type { AppointmentPublic } from '@/lib/types'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours} h`
  return `${hours}h ${remainingMinutes}min`
}

function formatDate(dateString: Date | string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(dateString: Date | string): string {
  const d = new Date(dateString)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [appointment, setAppointment] = useState<AppointmentPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchAppointment = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/appointments/${token}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Cita no encontrada')
      }

      setAppointment(data.appointment)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar la cita')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointment()
  }, [token])

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-zinc-500">Cargando estado de tu cita...</p>
        </div>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Cita no encontrada
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            El enlace no es válido o la cita no existe. Por favor revisa el enlace de seguimiento.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Pedir una nueva cita
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalDuration = appointment.services.reduce((acc, s) => acc + s.durationMinutes, 0)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Salon header link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity"
          >
            ✂️ Portal Peluquería
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Status Banner */}
          <div
            className={`p-6 text-center border-b ${
              appointment.status === 'confirmed'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : appointment.status === 'cancelled'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-white/80 dark:bg-zinc-900/80 shadow-xs">
              {appointment.status === 'confirmed' && '✓ Cita Confirmada'}
              {appointment.status === 'pending' && '⏳ Pendiente de confirmación'}
              {appointment.status === 'cancelled' && '✕ Cita Cancelada'}
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              {appointment.status === 'confirmed' && '¡Tu cita está asegurada!'}
              {appointment.status === 'pending' && 'Solicitud recibida'}
              {appointment.status === 'cancelled' && 'La cita ha sido cancelada'}
            </h2>
            <p className="text-xs sm:text-sm mt-1 opacity-90 max-w-sm mx-auto">
              {appointment.status === 'confirmed' &&
                'El peluquero ha confirmado tu horario. Te esperamos en el salón.'}
              {appointment.status === 'pending' &&
                'El peluquero revisará tu cita en breve. Puedes recargar esta página para ver cambios.'}
              {appointment.status === 'cancelled' &&
                'Esta cita no se llevará a cabo. Puedes solicitar otra cuando desees.'}
            </p>
          </div>

          {/* Appointment details */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                  Cliente
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {appointment.clientName}
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                  Duración total
                </span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  ⏱ {formatDuration(totalDuration)}
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 sm:col-span-2">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                  Fecha y Horario
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 capitalize block">
                  {formatDate(appointment.startTime)}
                </span>
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  De {formatTime(appointment.startTime)} a {formatTime(appointment.endTime)}
                </span>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Servicios reservados ({appointment.services.length})
              </span>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                {appointment.services.map(service => (
                  <div
                    key={service.id}
                    className="p-3.5 flex items-center justify-between text-sm bg-zinc-50/50 dark:bg-zinc-800/30"
                  >
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {service.name}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sharing link */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Enlace privado de seguimiento
                </span>
                <button
                  type="button"
                  onClick={fetchAppointment}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                >
                  🔄 Actualizar estado
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-center">
              <Link
                href="/"
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ← Volver al inicio / Reservar otra cita
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
