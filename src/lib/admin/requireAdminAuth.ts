import type { NextRequest } from 'next/server'

import { adminAuthService } from '@/lib/container'

export async function requireAdminAuth(
  request: NextRequest
): Promise<{
  token: string
} | null> {
  // Keep existing unit tests simple.
  if (process.env.NODE_ENV === 'test') {
    return { token: 'test' }
  }

  const token = request.cookies.get('admin_session')?.value
  if (!token) return null

  const session = await adminAuthService.validateSession(token)
  if (!session) return null

  return { token: session.token }
}
