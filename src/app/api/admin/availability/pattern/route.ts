import { NextRequest, NextResponse } from 'next/server'
import { availabilityScheduler, initializeDefaults } from '@/lib/container'
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth'

// GET /api/admin/availability/pattern - Get weekly pattern
export async function GET(request: NextRequest) {
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pattern = await availabilityScheduler.getWeeklyPattern()
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
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { pattern } = body

    if (!pattern || typeof pattern !== 'object') {
      return NextResponse.json(
        { error: 'Pattern is required' },
        { status: 400 }
      )
    }

    await availabilityScheduler.setAnnualTemplate(pattern)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set pattern'
    console.error('Error setting pattern:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
