import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { BookingWizard } from '@/components/booking/BookingWizard'

describe('BookingWizard Component', () => {
  beforeEach(() => {
    // Mock fetch for services
    globalThis.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = url.toString()

      if (urlStr.includes('/api/services')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              services: [
                { id: 'svc-1', name: 'Corte de pelo', durationMinutes: 30 },
                { id: 'svc-2', name: 'Coloración completa', durationMinutes: 90 },
              ],
            }),
        } as Response)
      }

      if (urlStr.includes('/api/appointments/available')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              date: '2026-09-21',
              totalDuration: 30,
              availableTimes: ['09:00', '09:30', '10:00', '10:30'],
            }),
        } as Response)
      }

      if (urlStr.includes('/api/appointments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              appointment: {
                id: 'appt-123',
                token: 'token-abc-xyz',
                clientName: 'Juan García',
                clientPhone: '612345678',
                serviceIds: ['svc-1'],
                startTime: new Date('2026-09-21T10:00:00'),
                endTime: new Date('2026-09-21T10:30:00'),
                status: 'pending',
                createdAt: new Date(),
              },
            }),
        } as Response)
      }

      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`))
    }) as unknown as typeof fetch
  })

  it('renders services and allows selecting multiple services with live duration', async () => {
    render(<BookingWizard />)

    // Wait for services to load
    await waitFor(() => {
      expect(screen.getByText('Corte de pelo')).toBeInTheDocument()
    })

    expect(screen.getByText('Coloración completa')).toBeInTheDocument()

    // Select first service
    await act(async () => {
      fireEvent.click(screen.getByText('Corte de pelo'))
    })

    // Should show summary with duration
    expect(screen.getByText(/1 servicio/i)).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()

    // Select second service
    await act(async () => {
      fireEvent.click(screen.getByText('Coloración completa'))
    })

    // Total duration should now be 120 min (2 h)
    expect(screen.getByText(/2 servicios/i)).toBeInTheDocument()
    expect(screen.getByText('2 h')).toBeInTheDocument()
  })

  it('advances through the wizard steps to submit booking', async () => {
    render(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Corte de pelo')).toBeInTheDocument()
    })

    // Step 1: Select service and click Continuar
    await act(async () => {
      fireEvent.click(screen.getByText('Corte de pelo'))
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    })

    // Step 2: Date and Time selection
    await waitFor(() => {
      expect(screen.getByText('Elige fecha y hora')).toBeInTheDocument()
    })

    // Available times should appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '09:00' })).toBeInTheDocument()
    })

    // Select 09:00
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '09:00' }))
    })

    // Click Continuar a Datos
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar a datos/i }))
    })

    // Step 3: Client info
    await waitFor(() => {
      expect(screen.getByText('Tus datos de contacto')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/nombre y apellidos/i)
    const phoneInput = screen.getByLabelText(/teléfono de contacto/i)

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Juan García' } })
      fireEvent.change(phoneInput, { target: { value: '612345678' } })
    })

    // Submit reservation
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }))
    })

    // Success popup modal
    await waitFor(() => {
      expect(screen.getByText(/¡Reserva Solicitada con Éxito!/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Juan García')).toBeInTheDocument()
    expect(screen.getByText(/enlace de seguimiento/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver estado de mi cita/i })).toHaveAttribute(
      'href',
      '/cita/token-abc-xyz'
    )
  })
})
