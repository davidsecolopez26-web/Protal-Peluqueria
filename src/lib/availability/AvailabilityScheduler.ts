import type { WeeklyPattern, TimeSlot, DayException, Appointment } from '@/lib/types'
import type { AvailabilityRepository, AppointmentRepository } from '@/lib/db/adapters/types'
import { DEFAULT_WEEKLY_PATTERN } from '@/lib/types'

/**
 * AvailabilityScheduler - Deep module for managing availability
 *
 * Handles:
 * - Weekly pattern (template schedule)
 * - Day exceptions (holidays, special hours)
 * - Calculating available time slots based on services duration
 */
export class AvailabilityScheduler {
  constructor(
    private availabilityRepo: AvailabilityRepository,
    private appointmentRepo: AppointmentRepository
  ) {}

  /**
   * Set the weekly availability template
   */
  async setAnnualTemplate(pattern: WeeklyPattern): Promise<void> {
    // Validate each day
    for (const day of Object.keys(pattern) as (keyof WeeklyPattern)[]) {
      const slots = pattern[day]
      if (!Array.isArray(slots)) {
        throw new Error(`Invalid slots for ${day}`)
      }

      for (const slot of slots) {
        if (!this.isValidTimeSlot(slot)) {
          throw new Error(`Invalid time slot: ${slot.start} - ${slot.end}`)
        }

        if (!this.isBeforeEnd(slot.start, slot.end)) {
          throw new Error(`Start must be before end: ${slot.start} - ${slot.end}`)
        }
      }
    }

    await this.availabilityRepo.setWeeklyPattern(pattern)
  }

  /**
   * Get the current weekly pattern
   */
  async getWeeklyPattern(): Promise<WeeklyPattern> {
    const pattern = await this.availabilityRepo.getWeeklyPattern()
    return pattern || DEFAULT_WEEKLY_PATTERN
  }

  /**
   * Add an exception for a specific day
   * Note: An empty array means the day is closed all day
   */
  async addDayException(date: string, timeSlots: TimeSlot[]): Promise<DayException> {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format')
    }

    // Empty array means closed all day - this is valid
    if (timeSlots.length === 0) {
      return this.availabilityRepo.addDayException(date, [])
    }

    // Validate non-empty slots
    for (const slot of timeSlots) {
      if (!this.isValidTimeSlot(slot)) {
        throw new Error(`Invalid time slot: ${slot.start} - ${slot.end}`)
      }
    }

    return this.availabilityRepo.addDayException(date, timeSlots)
  }

  /**
   * Remove an exception for a specific day
   */
  async removeDayException(date: string): Promise<boolean> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format')
    }

    return this.availabilityRepo.removeDayException(date)
  }

  /**
   * Get exception for a specific day
   */
  async getDayException(date: string): Promise<DayException | null> {
    return this.availabilityRepo.getDayException(date)
  }

  /**
   * Get available slots for a given date and service durations
   * This is the core algorithm that calculates available time slots
   */
  async getAvailableSlots(date: string, serviceDurations: number[]): Promise<TimeSlot[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format')
    }

    const totalDuration = serviceDurations.reduce((sum, d) => sum + d, 0)

    // Get base slots for this day
    const baseSlots = await this.getBaseSlotsForDate(date)

    if (baseSlots.length === 0) {
      return [] // Closed or no availability
    }

    // Get existing appointments for this date
    const dateObj = new Date(date)
    const dayAfter = new Date(dateObj)
    dayAfter.setDate(dayAfter.getDate() + 1)

    const existingAppointments = await this.appointmentRepo.list({
      dateFrom: dateObj,
      dateTo: dayAfter,
    })

    // Filter confirmed appointments only
    const confirmedAppointments = existingAppointments.filter(
      a => a.status === 'confirmed'
    )

    // Calculate available slots
    const availableSlots: TimeSlot[] = []

    for (const slot of baseSlots) {
      // Find gaps in this slot
      const gaps = this.findGapsInSlot(
        slot,
        confirmedAppointments,
        dateObj,
        totalDuration
      )

      availableSlots.push(...gaps)
    }

    return availableSlots
  }

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(
    date: string,
    startTime: string,
    serviceDurations: number[]
  ): Promise<boolean> {
    const totalDuration = serviceDurations.reduce((sum, d) => sum + d, 0)
    const availableSlots = await this.getAvailableSlots(date, serviceDurations)

    // Convert startTime to minutes for comparison
    const startMinutes = this.timeToMinutes(startTime)

    for (const slot of availableSlots) {
      const slotStart = this.timeToMinutes(slot.start)
      const slotEnd = this.timeToMinutes(slot.end)

      if (startMinutes >= slotStart && (startMinutes + totalDuration) <= slotEnd) {
        return true
      }
    }

    return false
  }

  // ============== Private Helpers ==============

  /**
   * Get base slots for a date (from pattern or exception)
   */
  private async getBaseSlotsForDate(date: string): Promise<TimeSlot[]> {
    // Check for day exception first
    const exception = await this.availabilityRepo.getDayException(date)
    if (exception) {
      return exception.timeSlots
    }

    // Otherwise, use weekly pattern
    const dayOfWeek = new Date(date).getDay()
    const pattern = await this.getWeeklyPattern()

    const dayNames: (keyof WeeklyPattern)[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ]

    return pattern[dayNames[dayOfWeek]]
  }

  /**
   * Find gaps in a slot where a new appointment fits
   */
  private findGapsInSlot(
    slot: TimeSlot,
    appointments: Appointment[],
    date: Date,
    duration: number
  ): TimeSlot[] {
    const gaps: TimeSlot[] = []
    const slotStartMinutes = this.timeToMinutes(slot.start)
    const slotEndMinutes = this.timeToMinutes(slot.end)

    // Get appointments that overlap with this slot
    const overlappingAppointments = appointments.filter(appt => {
      const apptStart = new Date(appt.startTime)
      const apptDate = apptStart.toISOString().split('T')[0]
      return apptDate === date.toISOString().split('T')[0]
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    let currentPosition = slotStartMinutes

    for (const appt of overlappingAppointments) {
      const apptStartMinutes = new Date(appt.startTime).getHours() * 60 + new Date(appt.startTime).getMinutes()
      const apptEndMinutes = apptStartMinutes + (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000

      // Check if there's a gap before this appointment
      if (apptStartMinutes - currentPosition >= duration) {
        gaps.push({
          start: this.minutesToTime(currentPosition),
          end: this.minutesToTime(apptStartMinutes),
        })
      }

      // Move past this appointment
      currentPosition = Math.max(currentPosition, apptEndMinutes)
    }

    // Check for gap after last appointment
    if (slotEndMinutes - currentPosition >= duration) {
      gaps.push({
        start: this.minutesToTime(currentPosition),
        end: this.minutesToTime(slotEndMinutes),
      })
    }

    return gaps
  }

  /**
   * Validate time slot format
   * Note: 00:00-00:00 is a special case for "closed all day" in exceptions
   */
  private isValidTimeSlot(slot: TimeSlot): boolean {
    if (!slot.start || !slot.end) return false
    if (!/^\d{2}:\d{2}$/.test(slot.start) || !/^\d{2}:\d{2}$/.test(slot.end)) {
      return false
    }

    const start = this.timeToMinutes(slot.start)
    const end = this.timeToMinutes(slot.end)

    // Allow 00:00-00:00 for "closed all day" exceptions
    if (start === 0 && end === 0) return true

    return start < end && start >= 0 && end <= 24 * 60
  }

  /**
   * Check if start is before end
   */
  private isBeforeEnd(start: string, end: string): boolean {
    return this.timeToMinutes(start) < this.timeToMinutes(end)
  }

  /**
   * Convert HH:mm to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Convert minutes to HH:mm
   */
  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
}