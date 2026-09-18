// Domain types - following CONTEXT.md vocabulary

// ============================================
// Time Slot
// ============================================
export interface TimeSlot {
  start: string // "HH:mm" format, e.g., "09:00"
  end: string   // "HH:mm" format, e.g., "18:00"
}

// ============================================
// Weekly Pattern
// ============================================
export interface WeeklyPattern {
  sunday: TimeSlot[]
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
}

// ============================================
// Day Exception
// ============================================
export interface DayException {
  id: string
  date: string // ISO date "YYYY-MM-DD"
  timeSlots: TimeSlot[] // Empty array means closed
  createdAt: Date
}

// ============================================
// Service
// ============================================
export interface Service {
  id: string
  name: string
  durationMinutes: number
  createdAt: Date
}

// ============================================
// Appointment Status
// ============================================
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled'

// ============================================
// Appointment
// ============================================
export interface Appointment {
  id: string
  token: string
  clientName: string
  clientPhone: string
  serviceIds: string[]
  startTime: Date
  endTime: Date
  status: AppointmentStatus
  createdAt: Date
}

// ============================================
// Extended types for responses
// ============================================
export interface AppointmentWithToken extends Appointment {
  token: string
}

export interface AppointmentPublic {
  token: string
  clientName: string
  services: Service[]
  startTime: Date
  endTime: Date
  status: AppointmentStatus
}

export interface AppointmentCreateInput {
  clientName: string
  clientPhone: string
  serviceIds: string[]
  startTime: Date
}

export interface AppointmentUpdateInput {
  status?: AppointmentStatus
  startTime?: Date
  serviceIds?: string[]
}

export interface ServiceCreateInput {
  name: string
  durationMinutes: number
}

export interface ServiceUpdateInput {
  name?: string
  durationMinutes?: number
}

// ============================================
// Filter types
// ============================================
export interface AppointmentFilters {
  status?: AppointmentStatus
  dateFrom?: Date
  dateTo?: Date
}

// ============================================
// Default Weekly Pattern
// ============================================
export const DEFAULT_WEEKLY_PATTERN: WeeklyPattern = {
  sunday: [],
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
  saturday: [],
}