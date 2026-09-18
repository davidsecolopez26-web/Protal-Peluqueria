import { NextResponse } from 'next/server'
import { InMemoryServiceRepository } from '@/lib/db/adapters/in-memory'
import { ServiceCatalog } from '@/lib/services'

// Initialize repository and service catalog (in production, use dependency injection)
const repository = new InMemoryServiceRepository()
const serviceCatalog = new ServiceCatalog(repository)

// Initialize with some default services
const initServices = async () => {
  const existing = await repository.listAll()
  if (existing.length === 0) {
    await repository.create({ name: 'Corte de pelo', durationMinutes: 30 })
    await repository.create({ name: 'Corte y peinado', durationMinutes: 45 })
    await repository.create({ name: 'Coloración completa', durationMinutes: 120 })
    await repository.create({ name: 'Mechas', durationMinutes: 180 })
    await repository.create({ name: 'Tratamiento capilar', durationMinutes: 60 })
  }
}

// Initialize on first request
let initialized = false

export async function GET() {
  if (!initialized) {
    await initServices()
    initialized = true
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