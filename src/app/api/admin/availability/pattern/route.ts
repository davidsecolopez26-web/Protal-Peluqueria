import { NextRequest, NextResponse } from 'next/server'
import { InMemoryAvailabilityRepository } from '@/lib/db/adapters/in-memory'
import { InMemoryAppointmentRepository } from '@/lib/db/adapters/in-memory'
import { AvailabilityScheduler } from '@/lib/availability'

// Initialize repositories and scheduler
const availabilityRepo = new InMemoryAvailabilityRepository()
const appointmentRepo = new InMemoryAppointmentRepository()
const scheduler = new AvailabilityScheduler(availabilityRepo, appointmentRepo)

// GET /api/admin/availability/pattern - Get weekly pattern
export async function GET() {
  try {
    const pattern = await scheduler.getWeeklyPattern()
    return NextResponse.json({ pattern })
  } catch (error) {
    console.error('Error fetching pattern:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pattern' },
      { status: 500 }
    )
  }
}

// POST /api/admin/availability/pattern - Set weekly pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pattern } = body

    if (!pattern || typeof pattern !== 'object') {
      return NextResponse.json(
        { error: 'Pattern is required' },
        { status: 400 }
      )
    }

    await scheduler.setAnnualTemplate(pattern)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set pattern'
    console.error('Error setting pattern:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}