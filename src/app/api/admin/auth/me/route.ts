import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuthService } from '@/lib/admin'
import { adminSessionRepo, initializeDefaults } from '@/lib/container'

export async function GET(request: NextRequest) {
  await initializeDefaults()

  try {
    const cookies = request.cookies
    const token = cookies.get('admin_session')?.value

    const authService = createAdminAuthService(adminSessionRepo)
    const session = await authService.validateSession(token || '')

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({ authenticated: true, session })
  } catch (error: unknown) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
