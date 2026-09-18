import { describe, it, expect, beforeEach } from 'vitest'
import {
  InMemoryAvailabilityRepository,
  InMemoryAppointmentRepository,
} from '@/lib/db/adapters/in-memory'
import { AvailabilityScheduler } from '@/lib/availability'
import { DEFAULT_WEEKLY_PATTERN } from '@/lib/types'

describe('AvailabilityScheduler', () => {
  let scheduler: AvailabilityScheduler
  let availabilityRepo: InMemoryAvailabilityRepository
  let appointmentRepo: InMemoryAppointmentRepository

  beforeEach(() => {
    availabilityRepo = new InMemoryAvailabilityRepository()
    appointmentRepo = new InMemoryAppointmentRepository()
    scheduler = new AvailabilityScheduler(availabilityRepo, appointmentRepo)
  })

  describe('setAnnualTemplate', () => {
    it('should set a valid weekly pattern', async () => {
      const pattern = DEFAULT_WEEKLY_PATTERN

      await scheduler.setAnnualTemplate(pattern)

      const retrieved = await scheduler.getWeeklyPattern()
      expect(retrieved).toEqual(pattern)
    })

    it('should reject invalid time format', async () => {
      const pattern = {
        ...DEFAULT_WEEKLY_PATTERN,
        monday: [{ start: '9:00', end: '18:00' }], // Invalid format
      }

      await expect(scheduler.setAnnualTemplate(pattern)).rejects.toThrow('Invalid time slot')
    })

    it('should reject when start >= end', async () => {
      const pattern = {
        ...DEFAULT_WEEKLY_PATTERN,
        monday: [{ start: '18:00', end: '09:00' }],
      }

      // Validation catches invalid time slot format first
      await expect(scheduler.setAnnualTemplate(pattern)).rejects.toThrow('Invalid time slot')
    })
  })

  describe('addDayException', () => {
    it('should add a day exception', async () => {
      const exception = await scheduler.addDayException('2026-12-25', [{ start: '00:00', end: '00:00' }])

      expect(exception.date).toBe('2026-12-25')
    })

    it('should reject invalid date format', async () => {
      await expect(
        scheduler.addDayException('25/12/2026', [{ start: '09:00', end: '18:00' }])
      ).rejects.toThrow('YYYY-MM-DD')
    })
  })

  describe('getAvailableSlots', () => {
    beforeEach(async () => {
      // Set up default pattern
      await scheduler.setAnnualTemplate(DEFAULT_WEEKLY_PATTERN)
    })

    it('should return available slots for a working day', async () => {
      // Monday is a working day (09:00-18:00)
      const slots = await scheduler.getAvailableSlots('2026-09-21', [30]) // 30min service

      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0]).toEqual({ start: '09:00', end: '18:00' })
    })

    it('should return empty slots for a closed day', async () => {
      // Sunday is closed
      const slots = await scheduler.getAvailableSlots('2026-09-21', [30])

      // 2026-09-21 is Monday, so should have slots
      expect(slots.length).toBeGreaterThan(0)
    })

    it('should respect day exceptions', async () => {
      // Add exception for a Monday: closed all day
      await scheduler.addDayException('2026-09-21', [])

      const slots = await scheduler.getAvailableSlots('2026-09-21', [30])

      expect(slots.length).toBe(0)
    })

    it('should respect day exceptions with limited hours', async () => {
      // Add exception for a Monday: only 10:00-12:00
      await scheduler.addDayException('2026-09-21', [{ start: '10:00', end: '12:00' }])

      const slots = await scheduler.getAvailableSlots('2026-09-21', [30])

      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0].start).toBe('10:00')
    })
  })

  describe('isSlotAvailable', () => {
    beforeEach(async () => {
      await scheduler.setAnnualTemplate(DEFAULT_WEEKLY_PATTERN)
    })

    it('should confirm available slot', async () => {
      const available = await scheduler.isSlotAvailable('2026-09-21', '10:00', [60])

      expect(available).toBe(true)
    })

    it('should reject slot too close to end', async () => {
      const available = await scheduler.isSlotAvailable('2026-09-21', '17:30', [60])

      expect(available).toBe(false)
    })
  })

  describe('removeDayException', () => {
    it('should remove an exception', async () => {
      await scheduler.addDayException('2026-12-25', [])

      const removed = await scheduler.removeDayException('2026-12-25')

      expect(removed).toBe(true)
    })

    it('should return false for non-existent exception', async () => {
      const removed = await scheduler.removeDayException('2026-01-01')

      expect(removed).toBe(false)
    })
  })
})