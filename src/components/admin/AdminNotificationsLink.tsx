'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function AdminNotificationsLink() {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/admin/appointments?status=pending')
        if (res.ok) {
          const data = await res.json()
          setPending((data.appointments || []).length)
        }
      } catch {
        // ignore
      }
    }
    fetchPending()
  }, [])

  return (
    <Link
      href="/admin/appointments"
      className="relative px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      Citas
      {pending > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
          {pending}
        </span>
      )}
    </Link>
  )
}
