import { NextResponse } from 'next/server'
import { serviceCatalog, initializeDefaults } from '@/lib/container'

export async function GET() {
  await initializeDefaults()

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
