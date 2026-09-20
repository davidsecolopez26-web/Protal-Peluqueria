import { NextRequest, NextResponse } from 'next/server'
import { serviceCatalog, initializeDefaults } from '@/lib/container'
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth'

// GET /api/admin/services - List all services
export async function GET(request: NextRequest) {
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const services = await serviceCatalog.listServices()
    return NextResponse.json({ services })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

// POST /api/admin/services - Create a new service
export async function POST(request: NextRequest) {
  await initializeDefaults()

  const auth = await requireAdminAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, durationMinutes } = body

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number' },
        { status: 400 }
      )
    }

    const service = await serviceCatalog.addService(name, durationMinutes)
    return NextResponse.json({ service }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create service'
    console.error('Error creating service:', error)

    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
