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
} from '@/lib/types'

// ============================================
// Repository Interfaces
// ============================================

export interface ServiceRepository {
  create(input: ServiceCreateInput): Promise<Service>
  update(id: string, updates: ServiceUpdateInput): Promise<Service | null>
  delete(id: string): Promise<boolean>
  getById(id: string): Promise<Service | null>
  getByName(name: string): Promise<Service | null>
  listAll(): Promise<Service[]>
}

export interface AppointmentRepository {
  create(input: AppointmentCreateInput & { token: string; endTime: Date }): Promise<Appointment>
  update(id: string, updates: Partial<AppointmentUpdateInput>): Promise<Appointment | null>
  getById(id: string): Promise<Appointment | null>
  getByToken(token: string): Promise<Appointment | null>
  list(filters: AppointmentFilters): Promise<Appointment[]>
}

export interface AvailabilityRepository {
  setWeeklyPattern(pattern: WeeklyPattern): Promise<void>
  getWeeklyPattern(): Promise<WeeklyPattern | null>
  addDayException(date: string, timeSlots: { start: string; end: string }[]): Promise<DayException>
  removeDayException(date: string): Promise<boolean>
  getDayException(date: string): Promise<DayException | null>
  listDayExceptions(dateFrom?: string, dateTo?: string): Promise<DayException[]>
}

// ============================================
// Notification Hub Interface
// ============================================

export interface NotificationHub {
  notifyNewAppointment(appointment: Appointment): Promise<void>
  notifyConfirmation(appointment: Appointment, clientPhone: string): Promise<void>
  notifyCancellation(appointment: Appointment, clientPhone: string): Promise<void>
  notifyAdminUpdate(appointment: Appointment): Promise<void>
}