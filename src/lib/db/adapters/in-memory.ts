import type {
  Service,
  ServiceCreateInput,
  ServiceUpdateInput,
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentStatus,
  AppointmentFilters,
  WeeklyPattern,
  DayException,
  AdminSession,
  AdminSessionCreateInput,
} from '@/lib/types'
import type { ServiceRepository, AppointmentRepository, AvailabilityRepository, NotificationHub, AdminSessionRepository } from './types'

// ============================================
// In-Memory Service Repository (for testing)
// ============================================
export class InMemoryServiceRepository implements ServiceRepository {
  private services: Map<string, Service> = new Map()

  async create(input: ServiceCreateInput): Promise<Service> {
    // Check for duplicate name
    for (const s of this.services.values()) {
      if (s.name.toLowerCase() === input.name.toLowerCase()) {
        throw new Error(`Service with name "${input.name}" already exists`)
      }
    }
    if (input.durationMinutes <= 0) {
      throw new Error('Duration must be positive')
    }

    const service: Service = {
      id: crypto.randomUUID(),
      name: input.name,
      durationMinutes: input.durationMinutes,
      createdAt: new Date(),
    }
    this.services.set(service.id, service)
    return service
  }

  async update(id: string, updates: ServiceUpdateInput): Promise<Service | null> {
    const existing = this.services.get(id)
    if (!existing) return null

    if (updates.name && updates.name !== existing.name) {
      // Check for duplicate name
      for (const s of this.services.values()) {
        if (s.id !== id && s.name.toLowerCase() === updates.name!.toLowerCase()) {
          throw new Error(`Service with name "${updates.name}" already exists`)
        }
      }
    }

    const updated: Service = {
      ...existing,
      ...updates,
    }
    this.services.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.services.delete(id)
  }

  async getById(id: string): Promise<Service | null> {
    return this.services.get(id) || null
  }

  async getByName(name: string): Promise<Service | null> {
    for (const s of this.services.values()) {
      if (s.name.toLowerCase() === name.toLowerCase()) {
        return s
      }
    }
    return null
  }

  async listAll(): Promise<Service[]> {
    return Array.from(this.services.values())
  }
}

// ============================================
// In-Memory Appointment Repository (for testing)
// ============================================
export class InMemoryAppointmentRepository implements AppointmentRepository {
  private appointments: Map<string, Appointment> = new Map()

  async create(input: AppointmentCreateInput & { token: string; endTime: Date }): Promise<Appointment> {
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      token: input.token,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      serviceIds: input.serviceIds,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'pending',
      createdAt: new Date(),
    }
    this.appointments.set(appointment.id, appointment)
    return appointment
  }

  async update(id: string, updates: Partial<AppointmentUpdateInput>): Promise<Appointment | null> {
    const existing = this.appointments.get(id)
    if (!existing) return null

    const updated: Appointment = {
      ...existing,
      ...updates,
      id: existing.id, // preserve id
      createdAt: existing.createdAt, // preserve createdAt
    }
    this.appointments.set(id, updated)
    return updated
  }

  async getById(id: string): Promise<Appointment | null> {
    return this.appointments.get(id) || null
  }

  async getByToken(token: string): Promise<Appointment | null> {
    for (const a of this.appointments.values()) {
      if (a.token === token) return a
    }
    return null
  }

  async list(filters: AppointmentFilters): Promise<Appointment[]> {
    let results = Array.from(this.appointments.values())

    if (filters.status) {
      results = results.filter(a => a.status === filters.status)
    }

    if (filters.dateFrom) {
      results = results.filter(a => a.startTime >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      results = results.filter(a => a.startTime <= filters.dateTo!)
    }

    return results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }
}

// ============================================
// In-Memory Availability Repository (for testing)
// ============================================
export class InMemoryAvailabilityRepository implements AvailabilityRepository {
  private weeklyPattern: WeeklyPattern | null = null
  private dayExceptions: Map<string, DayException> = new Map()

  async setWeeklyPattern(pattern: WeeklyPattern): Promise<void> {
    this.weeklyPattern = pattern
  }

  async getWeeklyPattern(): Promise<WeeklyPattern | null> {
    return this.weeklyPattern
  }

  async addDayException(date: string, timeSlots: { start: string; end: string }[]): Promise<DayException> {
    const exception: DayException = {
      id: crypto.randomUUID(),
      date,
      timeSlots,
      createdAt: new Date(),
    }
    this.dayExceptions.set(date, exception)
    return exception
  }

  async removeDayException(date: string): Promise<boolean> {
    return this.dayExceptions.delete(date)
  }

  async getDayException(date: string): Promise<DayException | null> {
    return this.dayExceptions.get(date) || null
  }

  async listDayExceptions(_dateFrom?: string, _dateTo?: string): Promise<DayException[]> {
    return Array.from(this.dayExceptions.values())
  }
}

// ============================================
// In-Memory Notification Hub (for testing)
// ============================================
export class InMemoryNotificationHub implements NotificationHub {
  private logs: string[] = []

  async notifyNewAppointment(appointment: Appointment): Promise<void> {
    this.logs.push(`[NOTIFY] New appointment ${appointment.id} for ${appointment.clientName}`)
  }

  async notifyConfirmation(appointment: Appointment, _clientPhone: string): Promise<void> {
    this.logs.push(`[NOTIFY] Appointment ${appointment.id} confirmed`)
  }

  async notifyCancellation(appointment: Appointment, _clientPhone: string): Promise<void> {
    this.logs.push(`[NOTIFY] Appointment ${appointment.id} cancelled`)
  }

  async notifyAdminUpdate(appointment: Appointment): Promise<void> {
    this.logs.push(`[NOTIFY] Admin update for appointment ${appointment.id}`)
  }

  getLogs(): string[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }
}

// ============================================
// In-Memory Admin Session Repository (for testing)
// ============================================
export class InMemoryAdminSessionRepository implements AdminSessionRepository {
  private sessions: Map<string, AdminSession> = new Map()

  async create(input: AdminSessionCreateInput): Promise<AdminSession> {
    const session: AdminSession = {
      id: crypto.randomUUID(),
      token: input.token,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    }
    this.sessions.set(session.token, session)
    return session
  }

  async getByToken(token: string): Promise<AdminSession | null> {
    const session = this.sessions.get(token)
    if (!session) return null
    if (session.expiresAt <= new Date()) {
      this.sessions.delete(token)
      return null
    }
    return session
  }

  async delete(token: string): Promise<boolean> {
    return this.sessions.delete(token)
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date()
    let count = 0
    for (const [token, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token)
        count++
      }
    }
    return count
  }
}