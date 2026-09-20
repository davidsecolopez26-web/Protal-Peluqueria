import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  POST as adminLogin,
} from '@/app/api/admin/auth/login/route'
import { GET as adminMe } from '@/app/api/admin/auth/me/route'
import { adminSessionRepo, initializeDefaults } from '@/lib/container'
import { GET as listAdminAppointments } from '@/app/api/admin/appointments/route'

describe('Admin auth + protected admin routes', () => {
  beforeEach(async () => {
    // Reset in-memory admin sessions
    // @ts-expect-error accessing private maps for clean test resets
    adminSessionRepo.sessions.clear()
    await initializeDefaults()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('POST /api/admin/auth/login should create a session (sets cookie)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretToken: process.env.ADMIN_SECRET || 'admin-secret',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      }),
    })

    const res = await adminLogin(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.session).toBeDefined()
    expect(typeof data.session.token).toBe('string')

    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toContain('admin_session=')
  })

  it('GET /api/admin/auth/me should return authenticated when cookie is valid', async () => {
    const loginReq = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretToken: process.env.ADMIN_SECRET || 'admin-secret',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      }),
    })

    const loginRes = await adminLogin(loginReq)
    const loginData = await loginRes.json()
    const token = loginData.session.token

    const meReq = new NextRequest('http://localhost:3000/api/admin/auth/me', {
      headers: {
        cookie: `admin_session=${token}`,
      },
    })

    const meRes = await adminMe(meReq)
    const meData = await meRes.json()

    expect(meRes.status).toBe(200)
    expect(meData.authenticated).toBe(true)
  })

  it('GET /api/admin/auth/me should return 401 when cookie is missing/invalid', async () => {
    const meReqInvalid = new NextRequest('http://localhost:3000/api/admin/auth/me', {
      headers: {
        cookie: 'admin_session=invalid-token',
      },
    })
    const meResInvalid = await adminMe(meReqInvalid)
    expect(meResInvalid.status).toBe(401)

    const meReqMissing = new NextRequest('http://localhost:3000/api/admin/auth/me')
    const meResMissing = await adminMe(meReqMissing)
    expect(meResMissing.status).toBe(401)
  })

  it('GET /api/admin/appointments should be unauthorized without session cookie (NODE_ENV=production)', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const req = new NextRequest('http://localhost:3000/api/admin/appointments')
    const res = await listAdminAppointments(req)

    expect(res.status).toBe(401)
  })

  it('GET /api/admin/appointments should be authorized with valid session cookie (NODE_ENV=production)', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const token = 'admin-session-token-1'
    await adminSessionRepo.create({
      token,
      expiresAt: new Date(Date.now() + 60_000),
    })

    const req = new NextRequest('http://localhost:3000/api/admin/appointments', {
      headers: {
        cookie: `admin_session=${token}`,
      },
    })

    const res = await listAdminAppointments(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data.appointments)).toBe(true)
  })
})
