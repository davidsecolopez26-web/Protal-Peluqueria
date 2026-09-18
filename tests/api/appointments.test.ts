import { describe, it, expect, beforeEach } from 'vitest'
import { GET as getAvailable } from '@/app/api/appointments/available/route'
import { POST as createAppointment, GET as listAppointments } from '@/app/api/appointments/route'
import { GET as getByToken } from '@/app/api/appointments/[token]/route'
import { PATCH as updateAppointment } from '@/app/api/admin/appointments/[id]/route'
import {
  serviceRepo,
  appointmentRepo,
  availabilityRepo,
  initializeDefaults,
} from '@/lib/container'
import { NextRequest } from 'next/server'

describe('Appointments API Routes', () => {
  let corteId: string
  let tinteId: string

  beforeEach(async () => {
    // Reset in-memory repositories
    // @ts-expect-error accessing private maps for clean test resets
    serviceRepo.services.clear()
    // @ts-expect-error accessing private maps for clean test resets
    appointmentRepo.appointments.clear()
    // @ts-expect-error accessing private maps for clean test resets
    availabilityRepo.dayExceptions.clear()

    await initializeDefaults()

    const allServices = await serviceRepo.listAll()
    corteId = allServices.find(s => s.name.includes('Corte'))!.id
    tinteId = allServices.find(s => s.name.includes('Coloración'))!.id
  })

  describe('GET /api/appointments/available', () => {
    it('should return available times for valid date and services', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/appointments/available?date=2026-09-21&services=${corteId}&step=30`
      )

      const res = await getAvailable(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.date).toBe('2026-09-21')
      expect(data.totalDuration).toBe(30)
      expect(Array.isArray(data.availableTimes)).toBe(true)
      expect(data.availableTimes.length).toBeGreaterThan(0)
      expect(data.availableTimes).toContain('09:00')
    })

    it('should return 400 if date is missing or invalid format', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/appointments/available?date=21-09-2026&services=${corteId}`
      )

      const res = await getAvailable(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 if services parameter is missing', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/appointments/available?date=2026-09-21'
      )

      const res = await getAvailable(req)
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/appointments', () => {
    it('should create an appointment and return access token with 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Elena Ramos',
          clientPhone: '699112233',
          serviceIds: [corteId],
          date: '2026-09-21',
          time: '11:00',
        }),
      })

      const res = await createAppointment(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.appointment).toBeDefined()
      expect(data.appointment.token).toBeDefined()
      expect(data.appointment.clientName).toBe('Elena Ramos')
      expect(data.appointment.status).toBe('pending')
    })

    it('should return 409 if time slot is already unavailable', async () => {
      // First appointment booking at 10:00
      const req1 = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Cliente 1',
          clientPhone: '611223344',
          serviceIds: [corteId],
          date: '2026-09-21',
          time: '10:00',
        }),
      })
      const res1 = await createAppointment(req1)
      const data1 = await res1.json()

      // Confirm first appointment so it locks the slot
      const updateReq = new NextRequest(
        `http://localhost:3000/api/admin/appointments/${data1.appointment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm' }),
        }
      )
      await updateAppointment(updateReq, {
        params: Promise.resolve({ id: data1.appointment.id }),
      })

      // Try booking same slot
      const req2 = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Cliente 2',
          clientPhone: '655667788',
          serviceIds: [corteId],
          date: '2026-09-21',
          time: '10:00',
        }),
      })

      const res2 = await createAppointment(req2)
      const data2 = await res2.json()

      expect(res2.status).toBe(409)
      expect(data2.error).toContain('not available')
    })
  })

  describe('GET /api/appointments/[token]', () => {
    it('should return public appointment details for valid token', async () => {
      const createReq = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Raul Alvarez',
          clientPhone: '677889900',
          serviceIds: [corteId, tinteId],
          date: '2026-09-21',
          time: '15:00',
        }),
      })
      const createRes = await createAppointment(createReq)
      const createData = await createRes.json()
      const token = createData.appointment.token

      const getReq = new NextRequest(
        `http://localhost:3000/api/appointments/${token}`
      )
      const getRes = await getByToken(getReq, {
        params: Promise.resolve({ token }),
      })
      const getData = await getRes.json()

      expect(getRes.status).toBe(200)
      expect(getData.appointment).toBeDefined()
      expect(getData.appointment.clientName).toBe('Raul Alvarez')
      expect(getData.appointment.services).toHaveLength(2)
    })

    it('should return 404 for invalid token', async () => {
      const getReq = new NextRequest(
        'http://localhost:3000/api/appointments/invalid-token-123'
      )
      const getRes = await getByToken(getReq, {
        params: Promise.resolve({ token: 'invalid-token-123' }),
      })

      expect(getRes.status).toBe(404)
    })
  })

  describe('Admin actions on appointments', () => {
    it('should confirm appointment and list it', async () => {
      const createReq = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Sonia Perez',
          clientPhone: '622334455',
          serviceIds: [corteId],
          date: '2026-09-21',
          time: '12:00',
        }),
      })
      const createRes = await createAppointment(createReq)
      const { appointment } = await createRes.json()

      // Confirm
      const patchReq = new NextRequest(
        `http://localhost:3000/api/admin/appointments/${appointment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm' }),
        }
      )
      const patchRes = await updateAppointment(patchReq, {
        params: Promise.resolve({ id: appointment.id }),
      })
      const patchData = await patchRes.json()

      expect(patchRes.status).toBe(200)
      expect(patchData.appointment.status).toBe('confirmed')

      // List confirmed
      const listReq = new NextRequest(
        'http://localhost:3000/api/appointments?status=confirmed'
      )
      const listRes = await listAppointments(listReq)
      const listData = await listRes.json()

      expect(listRes.status).toBe(200)
      expect(listData.appointments).toHaveLength(1)
      expect(listData.appointments[0].id).toBe(appointment.id)
    })
  })
})
