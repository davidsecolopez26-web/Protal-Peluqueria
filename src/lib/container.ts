import {
  InMemoryServiceRepository,
  InMemoryAppointmentRepository,
  InMemoryAvailabilityRepository,
  InMemoryNotificationHub,
  InMemoryAdminSessionRepository,
} from '@/lib/db/adapters/in-memory'
import { ServiceCatalog } from '@/lib/services'
import { AvailabilityScheduler } from '@/lib/availability'
import { AppointmentService } from '@/lib/appointments'
import { DEFAULT_WEEKLY_PATTERN } from '@/lib/types'

// Global container for singleton in-memory storage across Next.js API routes & Server Actions
const globalForContainer = globalThis as unknown as {
  serviceRepo?: InMemoryServiceRepository
  appointmentRepo?: InMemoryAppointmentRepository
  availabilityRepo?: InMemoryAvailabilityRepository
  notificationHub?: InMemoryNotificationHub
  adminSessionRepo?: InMemoryAdminSessionRepository
  serviceCatalog?: ServiceCatalog
  availabilityScheduler?: AvailabilityScheduler
  appointmentService?: AppointmentService
}

export const serviceRepo =
  globalForContainer.serviceRepo ?? new InMemoryServiceRepository()
export const appointmentRepo =
  globalForContainer.appointmentRepo ?? new InMemoryAppointmentRepository()
export const availabilityRepo =
  globalForContainer.availabilityRepo ?? new InMemoryAvailabilityRepository()
export const notificationHub =
  globalForContainer.notificationHub ?? new InMemoryNotificationHub()
export const adminSessionRepo =
  globalForContainer.adminSessionRepo ?? new InMemoryAdminSessionRepository()

export const serviceCatalog =
  globalForContainer.serviceCatalog ?? new ServiceCatalog(serviceRepo)
export const availabilityScheduler =
  globalForContainer.availabilityScheduler ??
  new AvailabilityScheduler(availabilityRepo, appointmentRepo)
export const appointmentService =
  globalForContainer.appointmentService ??
  new AppointmentService(
    appointmentRepo,
    serviceCatalog,
    availabilityScheduler,
    notificationHub
  )

// Preserve singletons across hot reloads in Next.js development
if (process.env.NODE_ENV !== 'production') {
  globalForContainer.serviceRepo = serviceRepo
  globalForContainer.appointmentRepo = appointmentRepo
  globalForContainer.availabilityRepo = availabilityRepo
  globalForContainer.notificationHub = notificationHub
  globalForContainer.adminSessionRepo = adminSessionRepo
  globalForContainer.serviceCatalog = serviceCatalog
  globalForContainer.availabilityScheduler = availabilityScheduler
  globalForContainer.appointmentService = appointmentService
}

/**
 * Initialize default services and weekly pattern if database is empty
 */
export async function initializeDefaults() {
  // 1. Initialize weekly pattern if missing
  const currentPattern = await availabilityRepo.getWeeklyPattern()
  if (!currentPattern) {
    await availabilityRepo.setWeeklyPattern(DEFAULT_WEEKLY_PATTERN)
  }

  // 2. Initialize default services if empty
  const existingServices = await serviceRepo.listAll()
  if (existingServices.length === 0) {
    await serviceRepo.create({ name: 'Corte de pelo', durationMinutes: 30 })
    await serviceRepo.create({ name: 'Corte y peinado', durationMinutes: 45 })
    await serviceRepo.create({ name: 'Coloración completa', durationMinutes: 120 })
    await serviceRepo.create({ name: 'Mechas', durationMinutes: 180 })
    await serviceRepo.create({ name: 'Tratamiento capilar', durationMinutes: 60 })
    await serviceRepo.create({ name: 'Lavado y secado', durationMinutes: 30 })
  }
}
