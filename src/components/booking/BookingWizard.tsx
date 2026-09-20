'use client'

import { useState, useEffect } from 'react'
import type { Service, AppointmentWithToken } from '@/lib/types'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours} h`
  return `${hours}h ${remainingMinutes}min`
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BookingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  // Step 2 state
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [loadingTimes, setLoadingTimes] = useState(false)
  const [timesError, setTimesError] = useState<string | null>(null)

  // Step 3 state
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Success Modal state
  const [createdAppointment, setCreatedAppointment] =
    useState<AppointmentWithToken | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch services on mount
  useEffect(() => {
    async function loadServices() {
      try {
        setLoadingServices(true)
        const res = await fetch('/api/services')
        const data = await res.json()
        if (data.services) {
          setServices(data.services)
        }
      } catch (err) {
        console.error('Error fetching services:', err)
      } finally {
        setLoadingServices(false)
      }
    }
    loadServices()
  }, [])

  // Fetch available times when date or selected services change
  useEffect(() => {
    if (selectedServiceIds.length === 0 || !selectedDate) {
      setAvailableTimes([])
      return
    }

    async function loadAvailableTimes() {
      try {
        setLoadingTimes(true)
        setTimesError(null)
        setSelectedTime('')
        const params = new URLSearchParams({
          date: selectedDate,
          services: selectedServiceIds.join(','),
          step: '30',
        })
        const res = await fetch(`/api/appointments/available?${params.toString()}`)
        const data = await res.json()

        if (res.ok && Array.isArray(data.availableTimes)) {
          setAvailableTimes(data.availableTimes)
        } else {
          setTimesError(data.error || 'No hay horarios disponibles')
          setAvailableTimes([])
        }
      } catch (err) {
        console.error('Error fetching available times:', err)
        setTimesError('Error al cargar horarios disponibles')
        setAvailableTimes([])
      } finally {
        setLoadingTimes(false)
      }
    }

    loadAvailableTimes()
  }, [selectedDate, selectedServiceIds])

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    )
  }

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!clientName.trim() || clientName.trim().length < 2) {
      setSubmitError('Por favor introduce tu nombre completo (mínimo 2 caracteres).')
      return
    }

    const digits = clientPhone.replace(/\D/g, '')
    if (digits.length < 9) {
      setSubmitError('Por favor introduce un teléfono de contacto válido (mínimo 9 dígitos).')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          serviceIds: selectedServiceIds,
          date: selectedDate,
          time: selectedTime,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la reserva')
      }

      setCreatedAppointment(data.appointment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al reservar'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const trackingUrl = createdAppointment
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/cita/${createdAppointment.token}`
      : `/cita/${createdAppointment.token}`
    : ''

  const handleCopyLink = () => {
    if (trackingUrl) {
      navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Wizard Progress Bar */}
      <div className="bg-zinc-100 dark:bg-zinc-800 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 ${
              step >= 1
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              1
            </span>
            <span>Servicios</span>
          </button>
          <div
            className={`flex-1 h-0.5 mx-3 ${
              step >= 2 ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
          <button
            type="button"
            onClick={() => selectedServiceIds.length > 0 && setStep(2)}
            disabled={selectedServiceIds.length === 0}
            className={`flex items-center gap-2 ${
              step >= 2
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              2
            </span>
            <span>Fecha y Hora</span>
          </button>
          <div
            className={`flex-1 h-0.5 mx-3 ${
              step >= 3 ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
          <button
            type="button"
            onClick={() => selectedTime && setStep(3)}
            disabled={!selectedTime}
            className={`flex items-center gap-2 ${
              step >= 3
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 3
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              3
            </span>
            <span>Datos</span>
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* STEP 1: SELECT SERVICES */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Selecciona los servicios
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Puedes seleccionar uno o varios servicios para tu cita.
              </p>
            </div>

            {loadingServices ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500">Cargando catálogo de servicios...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No hay servicios disponibles en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {services.map(service => {
                  const isSelected = selectedServiceIds.includes(service.id)
                  return (
                    <div
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-zinc-900 dark:text-zinc-50 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <div className="font-semibold text-base">{service.name}</div>
                        <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          ⏱ {formatDuration(service.durationMinutes)}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors mt-0.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-4 h-4 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Total Duration Footer */}
            {selectedServiceIds.length > 0 && (
              <div className="bg-zinc-50 dark:bg-zinc-800/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">
                    Resumen de servicios
                  </span>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {selectedServiceIds.length}{' '}
                    {selectedServiceIds.length === 1 ? 'servicio' : 'servicios'} • Total:{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {formatDuration(totalDuration)}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SELECT DATE & TIME */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mb-2 inline-flex items-center gap-1 font-medium"
              >
                ← Cambiar servicios
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Elige fecha y hora
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Duración calculada: <strong>{formatDuration(totalDuration)}</strong>
              </p>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label
                htmlFor="date-select"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Fecha de la cita
              </label>
              <input
                id="date-select"
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-xs text-zinc-500 capitalize">
                {formatDateDisplay(selectedDate)}
              </p>
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Horas disponibles
              </label>

              {loadingTimes ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-500">Buscando franjas disponibles...</p>
                </div>
              ) : timesError || availableTimes.length === 0 ? (
                <div className="p-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-center space-y-2">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    No hay huecos disponibles para esta fecha
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    El salón puede estar cerrado o las franjas libres son menores a{' '}
                    {formatDuration(totalDuration)}. Por favor selecciona otra fecha.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {availableTimes.map(time => {
                    const isSelected = selectedTime === time
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 px-2 text-sm font-semibold rounded-lg border transition-all text-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:border-indigo-400'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedTime && (
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Continuar a Datos
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CLIENT DETAILS & CONFIRM */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mb-2 inline-flex items-center gap-1 font-medium"
              >
                ← Cambiar fecha u hora
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Tus datos de contacto
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Sin registros ni contraseñas. Solo necesitamos tu nombre y teléfono.
              </p>
            </div>

            {/* Reservation Summary Card */}
            <div className="bg-zinc-50 dark:bg-zinc-800/70 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2 text-sm">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>Resumen de tu cita</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {formatDuration(totalDuration)}
                </span>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 text-xs space-y-1">
                <p>
                  <strong>Servicios:</strong>{' '}
                  {selectedServices.map(s => s.name).join(', ')}
                </p>
                <p>
                  <strong>Fecha:</strong> {formatDateDisplay(selectedDate)}
                </p>
                <p>
                  <strong>Hora:</strong> {selectedTime}
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="client-name"
                  className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nombre y Apellidos *
                </label>
                <input
                  id="client-name"
                  type="text"
                  required
                  placeholder="Ej. María García López"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="client-phone"
                  className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Teléfono de contacto *
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  required
                  placeholder="Ej. 612 345 678"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Te avisaremos sobre el estado de tu cita.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300">
                {submitError}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Reservando cita...</span>
                  </>
                ) : (
                  <span>Confirmar Reserva</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* POP-UP CONFIRMATION MODAL */}
      {createdAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Icon */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                ¡Reserva Solicitada con Éxito!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Tu solicitud ha sido registrada y está pendiente de confirmación por el
                peluquero.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-zinc-50 dark:bg-zinc-800/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {createdAppointment.clientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fecha y Hora:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatDateDisplay(selectedDate)} a las {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Estado:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Pendiente de confirmación
                </span>
              </div>
            </div>

            {/* Tracking Link Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Tu enlace de seguimiento (sin contraseñas)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={trackingUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Guarda este enlace para comprobar en cualquier momento el estado de tu cita.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <a
                href={`/cita/${createdAppointment.token}`}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-center text-sm font-semibold transition-colors shadow-sm"
              >
                Ver estado de mi cita
              </a>
              <button
                type="button"
                onClick={() => {
                  setCreatedAppointment(null)
                  setStep(1)
                  setSelectedServiceIds([])
                  setSelectedTime('')
                }}
                className="py-2.5 px-4 rounded-xl text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Nueva reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
