'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookingWizard } from '@/components/booking/BookingWizard'

export default function HomePage() {
  const [tokenInput, setTokenInput] = useState('')
  const router = useRouter()

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (tokenInput.trim()) {
      router.push(`/cita/${tokenInput.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Navigation Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-lg sm:text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
            <span>✂️</span>
            <span>Peluquería Estilo & Arte</span>
          </div>

          <a
            href="#consultar-cita"
            className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Consultar cita existente
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
            ✨ Reserva rápida sin registro
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Reserva tu cita en segundos
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            Elige los servicios que necesites, selecciona tu horario ideal y recibe un enlace único para seguir tu reserva al instante.
          </p>
        </div>

        {/* Interactive Booking Wizard */}
        <div className="pt-2">
          <BookingWizard />
        </div>

        {/* Existing Appointment Lookup section */}
        <div
          id="consultar-cita"
          className="pt-12 border-t border-zinc-200 dark:border-zinc-800 max-w-lg mx-auto text-center space-y-4"
        >
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
            ¿Ya tienes una reserva?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Introduce el código o token de tu cita para ver su estado actual o detalles.
          </p>
          <form onSubmit={handleLookup} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="text"
              placeholder="Pega tu código de cita..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Consultar
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-xs text-zinc-400">
        <p>© {new Date().getFullYear()} Peluquería Estilo & Arte. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
