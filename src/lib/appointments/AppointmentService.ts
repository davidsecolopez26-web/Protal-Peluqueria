import type {
  Appointment,
  AppointmentWithToken,
  AppointmentPublic,
  AppointmentFilters,
  AppointmentStatus,
  Service,
  TimeSlot,
} from '@/lib/types'
import type { AppointmentRepository, NotificationHub } from '@/lib/db/adapters/types'
import { ServiceCatalog } from '@/lib/services'
import { AvailabilityScheduler } from '@/lib/availability'

export interface CreateAppointmentInput {
  clientName: string
  clientPhone: string
  serviceIds: string[]
  date?: string // "YYYY-MM-DD"
  time?: string // "HH:mm"
  startTime?: Date | string
}

export interface ModifyAppointmentInput {
  startTime?: Date | string
  serviceIds?: string[]
  status?: AppointmentStatus
}

/**
 * AppointmentService - Deep module for managing appointments lifecycle
 *
 * Handles:
 * - Validating appointment requests (client data, services, availability)
 * - Cryptographic token generation for zero-login tracking
 * - Creating, confirming, cancelling and modifying appointments
 * - Dispatching notifications through the NotificationHub
 * - Calculating available time slot intervals for client booking
 */
export class AppointmentService {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private serviceCatalog: ServiceCatalog,
    private availabilityScheduler: AvailabilityScheduler,
    private notificationHub: NotificationHub
  ) {}

  /**
   * Create a new appointment with zero-login access token
   */
  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentWithToken> {
    // 1. Validate client name
    const clientName = this.validateClientName(input.clientName)

    // 2. Validate client phone
    const clientPhone = this.validateClientPhone(input.clientPhone)

    // 3. Validate service IDs
    if (!Array.isArray(input.serviceIds) || input.serviceIds.length === 0) {
      throw new Error('At least one service must be selected')
    }

    const services: Service[] = []
    for (const serviceId of input.serviceIds) {
      const service = await this.serviceCatalog.getService(serviceId)
      if (!service) {
        throw new Error(`Service with ID "${serviceId}" does not exist`)
      }
      services.push(service)
    }

    // 4. Resolve date, time and start Date
    const { dateStr, timeStr, startDateTime } = this.resolveDateTime(input)

    // 5. Calculate total duration and end Date
    const serviceDurations = services.map(s => s.durationMinutes)
    const totalDuration = serviceDurations.reduce((sum, d) => sum + d, 0)
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000)

    // 6. Check slot availability
    const isAvailable = await this.availabilityScheduler.isSlotAvailable(
      dateStr,
      timeStr,
      serviceDurations
    )

    if (!isAvailable) {
      throw new Error('Requested time slot is not available')
    }

    // 7. Generate secure token
    const token = crypto.randomUUID()

    // 8. Create appointment in database
    const appointment = await this.appointmentRepo.create({
      clientName,
      clientPhone,
      serviceIds: input.serviceIds,
      startTime: startDateTime,
      endTime: endDateTime,
      token,
    })

    // 9. Dispatch notification
    await this.notificationHub.notifyNewAppointment(appointment)

    return appointment
  }

  /**
   * Confirm an appointment (admin action)
   */
  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getById(appointmentId)
    if (!appointment) {
      throw new Error(`Appointment with ID "${appointmentId}" not found`)
    }

    const updated = await this.appointmentRepo.update(appointmentId, {
      status: 'confirmed',
    })

    if (!updated) {
      throw new Error(`Failed to confirm appointment "${appointmentId}"`)
    }

    await this.notificationHub.notifyConfirmation(updated, updated.clientPhone)
    return updated
  }

  /**
   * Cancel an appointment (admin action)
   */
  async cancelAppointment(appointmentId: string, _reason?: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getById(appointmentId)
    if (!appointment) {
      throw new Error(`Appointment with ID "${appointmentId}" not found`)
    }

    const updated = await this.appointmentRepo.update(appointmentId, {
      status: 'cancelled',
    })

    if (!updated) {
      throw new Error(`Failed to cancel appointment "${appointmentId}"`)
    }

    await this.notificationHub.notifyCancellation(updated, updated.clientPhone)
    return updated
  }

  /**
   * Modify an appointment (admin action)
   */
  async modifyAppointment(
    appointmentId: string,
    updates: ModifyAppointmentInput
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getById(appointmentId)
    if (!appointment) {
      throw new Error(`Appointment with ID "${appointmentId}" not found`)
    }

    const serviceIds = updates.serviceIds || appointment.serviceIds
    const durations = await this.serviceCatalog.getServiceDurations(serviceIds)
    if (durations.length === 0) {
      throw new Error('Invalid services for appointment modification')
    }
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)

    let startDateTime = appointment.startTime
    if (updates.startTime) {
      startDateTime = typeof updates.startTime === 'string'
        ? new Date(updates.startTime)
        : updates.startTime

      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid start time')
      }
    }

    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000)

    const updated = await this.appointmentRepo.update(appointmentId, {
      startTime: startDateTime,
      serviceIds,
      status: updates.status || appointment.status,
    })

    if (!updated) {
      throw new Error(`Failed to update appointment "${appointmentId}"`)
    }

    // Set end time on updated
    updated.endTime = endDateTime

    await this.notificationHub.notifyAdminUpdate(updated)
    return updated
  }

  /**
   * Get public appointment details by access token (zero-login)
   */
  async getAppointmentByToken(token: string): Promise<AppointmentPublic | null> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return null
    }

    const appointment = await this.appointmentRepo.getByToken(token.trim())
    if (!appointment) {
      return null
    }

    const services: Service[] = []
    for (const serviceId of appointment.serviceIds) {
      const service = await this.serviceCatalog.getService(serviceId)
      if (service) {
        services.push(service)
      }
    }

    return {
      token: appointment.token,
      clientName: appointment.clientName,
      services,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
    }
  }

  /**
   * Get appointment by ID (admin)
   */
  async getAppointmentById(id: string): Promise<Appointment | null> {
    return this.appointmentRepo.getById(id)
  }

  /**
   * List appointments with optional filters (admin)
   */
  async listAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
    return this.appointmentRepo.list(filters)
  }

  /**
   * Get discrete available start time options (e.g., ["09:00", "09:30", "10:00"]) for UI
   */
  async getAvailableTimeOptions(
    date: string,
    serviceIds: string[],
    stepMinutes = 30
  ): Promise<string[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format')
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return []
    }

    const serviceDurations = await this.serviceCatalog.getServiceDurations(serviceIds)
    if (serviceDurations.length === 0) {
      return []
    }

    const totalDuration = serviceDurations.reduce((sum, d) => sum + d, 0)
    const availableGaps = await this.availabilityScheduler.getAvailableSlots(
      date,
      serviceDurations
    )

    const times: string[] = []

    for (const gap of availableGaps) {
      const gapStartMinutes = this.timeToMinutes(gap.start)
      const gapEndMinutes = this.timeToMinutes(gap.end)

      for (
        let current = gapStartMinutes;
        current + totalDuration <= gapEndMinutes;
        current += stepMinutes
      ) {
        times.push(this.minutesToTime(current))
      }
    }

    return times
  }

  // ============== Private Helpers ==============

  private validateClientName(name: string): string {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Client name is required')
    }
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      throw new Error('Client name must be at least 2 characters')
    }
    if (trimmed.length > 100) {
      throw new Error('Client name cannot exceed 100 characters')
    }
    return trimmed
  }

  private validateClientPhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Client phone is required')
    }
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '')
    // Phone must have at least 9 digits
    const digitsOnly = cleaned.replace(/\D/g, '')
    if (digitsOnly.length < 9) {
      throw new Error('Valid phone number is required (at least 9 digits)')
    }
    return phone.trim()
  }

  private resolveDateTime(input: CreateAppointmentInput): {
    dateStr: string
    timeStr: string
    startDateTime: Date
  } {
    if (input.date && input.time) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        throw new Error('Date must be in YYYY-MM-DD format')
      }
      if (!/^\d{2}:\d{2}$/.test(input.time)) {
        throw new Error('Time must be in HH:mm format')
      }

      const [year, month, day] = input.date.split('-').map(Number)
      const [hours, minutes] = input.time.split(':').map(Number)
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)

      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid date or time')
      }

      return {
        dateStr: input.date,
        timeStr: input.time,
        startDateTime,
      }
    }

    if (input.startTime) {
      const startDateTime = typeof input.startTime === 'string'
        ? new Date(input.startTime)
        : input.startTime

      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid start time')
      }

      const y = startDateTime.getFullYear()
      const m = String(startDateTime.getMonth() + 1).padStart(2, '0')
      const d = String(startDateTime.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      const hh = String(startDateTime.getHours()).padStart(2, '0')
      const mm = String(startDateTime.getMinutes()).padStart(2, '0')
      const timeStr = `${hh}:${mm}`

      return {
        dateStr,
        timeStr,
        startDateTime,
      }
    }

    throw new Error('Appointment date and time are required')
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
}
