'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton'
import { AdminNotificationsLink } from '@/components/admin/AdminNotificationsLink'

export function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/me')
        setAuthenticated(res.ok)
      } catch {
        setAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-500">Cargando...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full text-center space-y-3">
          <div className="text-3xl">🔒</div>
          <div className="text-zinc-900 dark:text-zinc-100 font-semibold">
            Acceso admin requerido
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Abre la página de login usando tu URL secreta.
          </div>
          <a
            href="/admin/admin-secret"
            className="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
          >
            Ir al login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/services"
              className="font-black text-sm text-indigo-600 dark:text-indigo-400 tracking-tight"
            >
              ✂️ Admin
            </Link>
            <nav className="flex gap-1">
              <Link
                href="/admin/services"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Servicios
              </Link>
              <AdminNotificationsLink />
            </nav>
          </div>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  )
}
