import { describe, it, expect, beforeEach } from 'vitest'
import {
  InMemoryServiceRepository,
  InMemoryAppointmentRepository,
  InMemoryAvailabilityRepository,
  InMemoryNotificationHub,
} from '@/lib/db/adapters/in-memory'
import { ServiceCatalog } from '@/lib/services'
import { AvailabilityScheduler } from '@/lib/availability'
import { AppointmentService } from '@/lib/appointments'
import { DEFAULT_WEEKLY_PATTERN } from '@/lib/types'

describe('AppointmentService', () => {
  let serviceRepo: InMemoryServiceRepository
  let appointmentRepo: InMemoryAppointmentRepository
  let availabilityRepo: InMemoryAvailabilityRepository
  let notificationHub: InMemoryNotificationHub
  let serviceCatalog: ServiceCatalog
  let availabilityScheduler: AvailabilityScheduler
  let appointmentService: AppointmentService

  let corteServiceId: string
  let tinteServiceId: string

  beforeEach(async () => {
    serviceRepo = new InMemoryServiceRepository()
    appointmentRepo = new InMemoryAppointmentRepository()
    availabilityRepo = new InMemoryAvailabilityRepository()
    notificationHub = new InMemoryNotificationHub()

    serviceCatalog = new ServiceCatalog(serviceRepo)
    availabilityScheduler = new AvailabilityScheduler(availabilityRepo, appointmentRepo)
    appointmentService = new AppointmentService(
      appointmentRepo,
      serviceCatalog,
      availabilityScheduler,
      notificationHub
    )

    // Setup working schedule (Monday - Friday 09:00 - 18:00)
    await availabilityScheduler.setAnnualTemplate(DEFAULT_WEEKLY_PATTERN)

    // Setup initial services
    const corte = await serviceCatalog.addService('Corte Caballero', 30)
    const tinte = await serviceCatalog.addService('Coloración Completa', 90)
    corteServiceId = corte.id
    tinteServiceId = tinte.id
  })

  describe('createAppointment', () => {
    it('should create an appointment with valid data and return a token', async () => {
      const result = await appointmentService.createAppointment({
        clientName: 'Juan Pérez',
        clientPhone: '612345678',
        serviceIds: [corteServiceId],
        date: '2026-09-21', // Monday
        time: '10:00',
      })

      expect(result.id).toBeDefined()
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')
      expect(result.status).toBe('pending')
      expect(result.clientName).toBe('Juan Pérez')
      expect(result.clientPhone).toBe('612345678')
      expect(result.serviceIds).toEqual([corteServiceId])

      // 30 min duration -> ends at 10:30
      const start = new Date(result.startTime)
      const end = new Date(result.endTime)
      expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000)

      // Notification sent
      const logs = notificationHub.getLogs()
      expect(logs.some(l => l.includes('New appointment'))).toBe(true)
    })

    it('should calculate combined duration for multiple services', async () => {
      const result = await appointmentService.createAppointment({
        clientName: 'María García',
        clientPhone: '+34 699 888 777',
        serviceIds: [corteServiceId, tinteServiceId], // 30 + 90 = 120 mins
        date: '2026-09-21',
        time: '10:00',
      })

      const start = new Date(result.startTime)
      const end = new Date(result.endTime)
      expect(end.getTime() - start.getTime()).toBe(120 * 60 * 1000) // 2 hours
    })

    it('should reject empty or invalid client name', async () => {
      await expect(
        appointmentService.createAppointment({
          clientName: ' ',
          clientPhone: '612345678',
          serviceIds: [corteServiceId],
          date: '2026-09-21',
          time: '10:00',
        })
      ).rejects.toThrow('Client name is required')

      await expect(
        appointmentService.createAppointment({
          clientName: 'A',
          clientPhone: '612345678',
          serviceIds: [corteServiceId],
          date: '2026-09-21',
          time: '10:00',
        })
      ).rejects.toThrow('at least 2 characters')
    })

    it('should reject invalid phone numbers', async () => {
      await expect(
        appointmentService.createAppointment({
          clientName: 'Juan Pérez',
          clientPhone: '12345', // < 9 digits
          serviceIds: [corteServiceId],
          date: '2026-09-21',
          time: '10:00',
        })
      ).rejects.toThrow('Valid phone number is required')
    })

    it('should reject empty service list', async () => {
      await expect(
        appointmentService.createAppointment({
          clientName: 'Juan Pérez',
          clientPhone: '612345678',
          serviceIds: [],
          date: '2026-09-21',
          time: '10:00',
        })
      ).rejects.toThrow('At least one service must be selected')
    })

    it('should reject non-existent service ID', async () => {
      await expect(
        appointmentService.createAppointment({
          clientName: 'Juan Pérez',
          clientPhone: '612345678',
          serviceIds: ['non-existent-id'],
          date: '2026-09-21',
          time: '10:00',
        })
      ).rejects.toThrow('does not exist')
    })

    it('should reject booking outside working hours', async () => {
      await expect(
        appointmentService.createAppointment({
          clientName: 'Juan Pérez',
          clientPhone: '612345678',
          serviceIds: [corteServiceId],
          date: '2026-09-21',
          time: '20:00', // Closes at 18:00
        })
      ).rejects.toThrow('Requested time slot is not available')
    })

    it('should reject booking on a closed day', async () => {
      await expect(
        appointmentService.createAppointment({
          clientName: 'Juan Pérez',
          clientPhone: '612345678',
          serviceIds: [corteServiceId],
          date: '2026-09-20', // Sunday (closed)
          time: '10:00',
        })
      ).rejects.toThrow('Requested time slot is not available')
    })

    it('should reject booking when service exceeds closing time', async () => {
      // 90 min service starting at 17:30 with closing time at 18:00
      await expect(
        appointmentService.createAppointment({
          clientName: 'Juan Pérez',
          clientPhone: '612345678',
          serviceIds: [tinteServiceId], // 90 min
          date: '2026-09-21',
          time: '17:30',
        })
      ).rejects.toThrow('Requested time slot is not available')
    })
  })

  describe('getAppointmentByToken', () => {
    it('should return appointment public details including populated services', async () => {
      const created = await appointmentService.createAppointment({
        clientName: 'Carlos Ruiz',
        clientPhone: '654321987',
        serviceIds: [corteServiceId],
        date: '2026-09-21',
        time: '11:00',
      })

      const publicInfo = await appointmentService.getAppointmentByToken(created.token)

      expect(publicInfo).not.toBeNull()
      expect(publicInfo?.token).toBe(created.token)
      expect(publicInfo?.clientName).toBe('Carlos Ruiz')
      expect(publicInfo?.status).toBe('pending')
      expect(publicInfo?.services).toHaveLength(1)
      expect(publicInfo?.services[0].name).toBe('Corte Caballero')
    })

    it('should return null for invalid or non-existent token', async () => {
      const res = await appointmentService.getAppointmentByToken('non-existent-token')
      expect(res).toBeNull()

      const resEmpty = await appointmentService.getAppointmentByToken('')
      expect(resEmpty).toBeNull()
    })
  })

  describe('confirmAppointment and cancellation', () => {
    it('should confirm appointment and block conflicting time slot for others', async () => {
      const appt = await appointmentService.createAppointment({
        clientName: 'Laura Sanchez',
        clientPhone: '611222333',
        serviceIds: [corteServiceId], // 30 min (10:00 - 10:30)
        date: '2026-09-21',
        time: '10:00',
      })

      const confirmed = await appointmentService.confirmAppointment(appt.id)
      expect(confirmed.status).toBe('confirmed')

      // Confirmation notification sent
      expect(notificationHub.getLogs().some(l => l.includes('confirmed'))).toBe(true)

      // Now 10:00 slot is occupied and unavailable for a new appointment
      await expect(
        appointmentService.createAppointment({
          clientName: 'Pedro López',
          clientPhone: '644555666',
          serviceIds: [corteServiceId],
          date: '2026-09-21',
          time: '10:00',
        })
      ).rejects.toThrow('Requested time slot is not available')

      // But 10:30 is available!
      const nextAppt = await appointmentService.createAppointment({
        clientName: 'Pedro López',
        clientPhone: '644555666',
        serviceIds: [corteServiceId],
        date: '2026-09-21',
        time: '10:30',
      })
      expect(nextAppt.id).toBeDefined()
    })

    it('should cancel an appointment and notify client', async () => {
      const appt = await appointmentService.createAppointment({
        clientName: 'Ana Gomez',
        clientPhone: '677888999',
        serviceIds: [corteServiceId],
        date: '2026-09-21',
        time: '12:00',
      })

      const cancelled = await appointmentService.cancelAppointment(appt.id)
      expect(cancelled.status).toBe('cancelled')

      expect(notificationHub.getLogs().some(l => l.includes('cancelled'))).toBe(true)
    })
  })

  describe('getAvailableTimeOptions', () => {
    it('should return available start times with default 30-minute intervals', async () => {
      const options = await appointmentService.getAvailableTimeOptions(
        '2026-09-21', // Monday: 09:00 - 18:00
        [corteServiceId], // 30 min
        30
      )

      expect(options).toContain('09:00')
      expect(options).toContain('09:30')
      expect(options).toContain('17:30')
      expect(options).not.toContain('18:00') // Starts at 18:00 would end at 18:30 (past closing)
    })

    it('should exclude confirmed appointment intervals', async () => {
      // Create and confirm appointment 10:00 - 11:30 (90 min)
      const appt = await appointmentService.createAppointment({
        clientName: 'Test Booking',
        clientPhone: '600111222',
        serviceIds: [tinteServiceId], // 90 min (10:00 - 11:30)
        date: '2026-09-21',
        time: '10:00',
      })
      await appointmentService.confirmAppointment(appt.id)

      const options = await appointmentService.getAvailableTimeOptions(
        '2026-09-21',
        [corteServiceId], // 30 min
        30
      )

      // Available before
      expect(options).toContain('09:00')
      expect(options).toContain('09:30')

      // Blocked during 10:00 - 11:30
      expect(options).not.toContain('10:00')
      expect(options).not.toContain('10:30')
      expect(options).not.toContain('11:00')

      // Available after
      expect(options).toContain('11:30')
      expect(options).toContain('12:00')
    })

    it('should return empty list for closed day', async () => {
      const options = await appointmentService.getAvailableTimeOptions(
        '2026-09-20', // Sunday (closed)
        [corteServiceId]
      )

      expect(options).toEqual([])
    })
  })

  describe('modifyAppointment', () => {
    it('should modify appointment time and recalculate end time', async () => {
      const appt = await appointmentService.createAppointment({
        clientName: 'David S',
        clientPhone: '611000999',
        serviceIds: [corteServiceId],
        date: '2026-09-21',
        time: '14:00',
      })

      const modified = await appointmentService.modifyAppointment(appt.id, {
        startTime: new Date('2026-09-21T15:00:00'),
      })

      expect(new Date(modified.startTime).getHours()).toBe(15)
      expect(notificationHub.getLogs().some(l => l.includes('Admin update'))).toBe(true)
    })
  })
})
