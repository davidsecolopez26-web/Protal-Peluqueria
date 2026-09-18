import { pgTable, uuid, text, integer, timestamp, date, pgEnum, jsonb, boolean } from 'drizzle-orm/pg-core'

// ============================================
// Enums
// ============================================
export const appointmentStatusEnum = pgEnum('appointment_status', ['pending', 'confirmed', 'cancelled'])

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
])

// ============================================
// Tables
// ============================================

// Services table
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Appointments table
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  serviceIds: uuid('service_ids').array().notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: appointmentStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Weekly patterns table
export const weeklyPatterns = pgTable('weekly_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull().unique(),
  timeSlots: jsonb('time_slots').notNull().default([]),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Day exceptions table
export const dayExceptions = pgTable('day_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull().unique(),
  timeSlots: jsonb('time_slots').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Admin sessions table
export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================
// Type exports for queries
// ============================================
export type ServiceSelect = typeof services.$inferSelect
export type ServiceInsert = typeof services.$inferInsert
export type AppointmentSelect = typeof appointments.$inferSelect
export type AppointmentInsert = typeof appointments.$inferInsert
export type WeeklyPatternSelect = typeof weeklyPatterns.$inferSelect
export type WeeklyPatternInsert = typeof weeklyPatterns.$inferInsert
export type DayExceptionSelect = typeof dayExceptions.$inferSelect
export type DayExceptionInsert = typeof dayExceptions.$inferInsert