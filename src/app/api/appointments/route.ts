import { NextRequest, NextResponse } from 'next/server'
import { appointmentService, initializeDefaults } from '@/lib/container'
import type { AppointmentFilters, AppointmentStatus } from '@/lib/types'

// POST /api/appointments - Book a new appointment (Public)
export async function POST(request: NextRequest) {
  await initializeDefaults()

  try {
    const body = await request.json()
    const { clientName, clientPhone, serviceIds, date, time, startTime } = body

    if (!clientName || !clientPhone || !serviceIds) {
      return NextResponse.json(
        { error: 'clientName, clientPhone, and serviceIds are required' },
        { status: 400 }
      )
    }

    const appointment = await appointmentService.createAppointment({
      clientName,
      clientPhone,
      serviceIds,
      date,
      time,
      startTime,
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create appointment'
    console.error('Error creating appointment:', error)

    if (message.includes('not available')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// GET /api/appointments - List appointments (Admin filterable)
export async function GET(request: NextRequest) {
  await initializeDefaults()

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as AppointmentStatus | null
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')

    const filters: AppointmentFilters = {}
    if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
      filters.status = status
    }
    if (dateFromParam) {
      filters.dateFrom = new Date(dateFromParam)
    }
    if (dateToParam) {
      filters.dateTo = new Date(dateToParam)
    }

    const appointments = await appointmentService.listAppointments(filters)
    return NextResponse.json({ appointments })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to list appointments'
    console.error('Error listing appointments:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
