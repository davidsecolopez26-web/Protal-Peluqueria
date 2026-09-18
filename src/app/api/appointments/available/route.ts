import { NextRequest, NextResponse } from 'next/server'
import { appointmentService, serviceCatalog, initializeDefaults } from '@/lib/container'

// GET /api/appointments/available?date=YYYY-MM-DD&services=id1,id2&step=30
export async function GET(request: NextRequest) {
  await initializeDefaults()

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const servicesParam = searchParams.get('services')
    const stepParam = searchParams.get('step')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Date is required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    let serviceIds: string[] = []
    if (servicesParam) {
      serviceIds = servicesParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }

    if (serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one service ID must be specified' },
        { status: 400 }
      )
    }

    const stepMinutes = stepParam ? parseInt(stepParam, 10) : 30
    if (isNaN(stepMinutes) || stepMinutes <= 0) {
      return NextResponse.json(
        { error: 'Step must be a positive number of minutes' },
        { status: 400 }
      )
    }

    const totalDuration = await serviceCatalog.calculateTotalDuration(serviceIds)
    const availableTimes = await appointmentService.getAvailableTimeOptions(
      date,
      serviceIds,
      stepMinutes
    )

    return NextResponse.json({
      date,
      totalDuration,
      availableTimes,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to calculate available times'
    console.error('Error in /api/appointments/available:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
