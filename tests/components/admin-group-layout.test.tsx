import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AdminGroupLayout } from '@/app/admin/_components/AdminGroupLayout'

describe('AdminGroupLayout gate', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response),
    ) as unknown as typeof fetch
  })

  it('links "Ir al login" to the real secret login URL passed as prop', async () => {
    render(
      <AdminGroupLayout loginUrl="/admin-super-secreto">
        <div>Contenido protegido</div>
      </AdminGroupLayout>,
    )

    await waitFor(() => {
      expect(screen.getByText('Acceso admin requerido')).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: 'Ir al login' })
    expect(link).toHaveAttribute('href', '/admin-super-secreto')
  })
})
