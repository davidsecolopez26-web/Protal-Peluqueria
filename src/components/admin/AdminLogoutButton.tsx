'use client'

import { useRouter } from 'next/navigation'

export function AdminLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors"
    >
      Cerrar sesión
    </button>
  )
}
