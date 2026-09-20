import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuthService } from '@/lib/admin'
import { adminSessionRepo, initializeDefaults } from '@/lib/container'

export async function POST(request: NextRequest) {
  await initializeDefaults()

  try {
    const cookies = request.cookies
    const token = cookies.get('admin_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    const authService = createAdminAuthService(adminSessionRepo)
    const deleted = await authService.logout(token)

    const response = NextResponse.json({ success: deleted })
    response.cookies.delete('admin_session')

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
