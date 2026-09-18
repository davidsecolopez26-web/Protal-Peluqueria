import { NextRequest, NextResponse } from 'next/server'
import { InMemoryServiceRepository } from '@/lib/db/adapters/in-memory'
import { ServiceCatalog } from '@/lib/services'

// Initialize repository and service catalog
const repository = new InMemoryServiceRepository()
const serviceCatalog = new ServiceCatalog(repository)

// PATCH /api/admin/services/[id] - Update a service
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, durationMinutes } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const service = await serviceCatalog.updateService(id, updates)

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ service })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update service'
    console.error('Error updating service:', error)

    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// DELETE /api/admin/services/[id] - Delete a service
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const deleted = await serviceCatalog.deleteService(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete service'
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}