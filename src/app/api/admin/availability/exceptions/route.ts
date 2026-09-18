import { NextRequest, NextResponse } from 'next/server'
import { InMemoryAvailabilityRepository } from '@/lib/db/adapters/in-memory'
import { InMemoryAppointmentRepository } from '@/lib/db/adapters/in-memory'
import { AvailabilityScheduler } from '@/lib/availability'

// Initialize repositories and scheduler
const availabilityRepo = new InMemoryAvailabilityRepository()
const appointmentRepo = new InMemoryAppointmentRepository()
const scheduler = new AvailabilityScheduler(availabilityRepo, appointmentRepo)

// POST /api/admin/availability/exceptions - Add exception
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, timeSlots } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Date is required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    if (!Array.isArray(timeSlots)) {
      return NextResponse.json(
        { error: 'Time slots must be an array' },
        { status: 400 }
      )
    }

    const exception = await scheduler.addDayException(date, timeSlots)
    return NextResponse.json({ exception }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add exception'
    console.error('Error adding exception:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// GET /api/admin/availability/exceptions - List exceptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined

    const exceptions = await availabilityRepo.listDayExceptions(dateFrom, dateTo)
    return NextResponse.json({ exceptions })
  } catch (error) {
    console.error('Error fetching exceptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exceptions' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/availability/exceptions?date=YYYY-MM-DD - Remove exception
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Date is required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const deleted = await scheduler.removeDayException(date)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Exception not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove exception'
    console.error('Error removing exception:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}