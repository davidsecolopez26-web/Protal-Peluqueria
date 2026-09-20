import { NextRequest, NextResponse } from 'next/server'
import { appointmentService, initializeDefaults } from '@/lib/container'
import type { AppointmentFilters } from '@/lib/types'
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth'

// GET /api/admin/appointments - List all appointments with optional filters
export async function GET(request: NextRequest) {
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const filters: AppointmentFilters = {}
    if (status) filters.status = status as AppointmentFilters['status']
    if (dateFrom) filters.dateFrom = new Date(dateFrom)
    if (dateTo) filters.dateTo = new Date(dateTo)

    const appointments = await appointmentService.listAppointments(filters)
    return NextResponse.json({ appointments })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list appointments'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
