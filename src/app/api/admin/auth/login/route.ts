import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuthService } from '@/lib/admin'
import { adminSessionRepo, initializeDefaults } from '@/lib/container'

export async function POST(request: NextRequest) {
  await initializeDefaults()

  try {
    const body = await request.json()
    const { secretToken, password } = body

    if (!secretToken || !password) {
      return NextResponse.json(
        { error: 'Secret token and password are required' },
        { status: 400 }
      )
    }

    const authService = createAdminAuthService(adminSessionRepo)
    const session = await authService.login(secretToken, password)

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ session })
    response.cookies.set('admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
