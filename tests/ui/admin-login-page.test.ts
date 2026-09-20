// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// The login page must render its own form — it must NOT be wrapped by the
// auth-gate layout (the gate would replace the form with "Acceso admin
// requerido", making it impossible to log in).
describe('Admin login route structure', () => {
  let serverUp = false

  beforeAll(async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await fetch(`${BASE_URL}/admin-${ADMIN_SECRET}`)
        serverUp = true
        return
      } catch {
        await new Promise(r => setTimeout(r, 500))
      }
    }
    console.error(
      `[admin-login-page] dev server not reachable at ${BASE_URL} — skipping HTTP test`,
    )
  })

  it('secret login URL renders the login form, not the auth gate', async ctx => {
    if (!serverUp) return ctx.skip()

    const res = await fetch(`${BASE_URL}/admin-${ADMIN_SECRET}`)
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('Acceso Admin')
    expect(html).toContain('type="password"')
    expect(html).not.toContain('Acceso admin requerido')
  })

  it('auth gate layout is not at the admin route root (it would wrap the login page)', () => {
    const root = path.resolve(__dirname, '../../src/app/admin')
    expect(fs.existsSync(path.join(root, 'layout.tsx'))).toBe(false)
    expect(fs.existsSync(path.join(root, '(panel)', 'layout.tsx'))).toBe(true)
  })
})
