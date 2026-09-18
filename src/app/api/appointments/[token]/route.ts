import { NextRequest, NextResponse } from 'next/server'
import { appointmentService, initializeDefaults } from '@/lib/container'

// GET /api/appointments/[token] - Public appointment lookup by access token
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await initializeDefaults()

  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const appointment = await appointmentService.getAppointmentByToken(token)

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ appointment })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve appointment'
    console.error('Error fetching appointment by token:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
