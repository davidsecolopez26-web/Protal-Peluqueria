import { NextRequest, NextResponse } from 'next/server'
import { appointmentService, initializeDefaults } from '@/lib/container'
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth'

// GET /api/admin/appointments/[id] - Get single appointment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const appointment = await appointmentService.getAppointmentById(id)

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
    console.error('Error in /api/admin/appointments/[id]:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/admin/appointments/[id] - Update appointment status or modify appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { action, status, startTime, serviceIds, reason } = body

    // Support explicit action triggers: 'confirm', 'cancel' or custom modifications
    if (action === 'confirm' || status === 'confirmed') {
      const confirmed = await appointmentService.confirmAppointment(id)
      return NextResponse.json({ appointment: confirmed })
    }

    if (action === 'cancel' || status === 'cancelled') {
      const cancelled = await appointmentService.cancelAppointment(id, reason)
      return NextResponse.json({ appointment: cancelled })
    }

    const modified = await appointmentService.modifyAppointment(id, {
      startTime,
      serviceIds,
      status,
    })

    return NextResponse.json({ appointment: modified })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update appointment'
    console.error('Error updating appointment in /api/admin/appointments/[id]:', error)

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
