import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret'

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Map required login pattern: /admin-[SECRET] -> /admin/[adminSecret]
  if (pathname.startsWith('/admin-') && !pathname.startsWith('/admin/')) {
    const secret = pathname.slice('/admin-'.length)
    if (secret) {
      const url = request.nextUrl.clone()
      url.pathname = `/admin/${secret}`
      return NextResponse.rewrite(url)
    }
  }

  // Allow the dynamic admin login page itself: /admin/<ADMIN_SECRET>
  if (pathname.startsWith('/admin/')) {
    const parts = pathname.split('/')
    const possibleSecret = parts[2]

    if (possibleSecret && possibleSecret === ADMIN_SECRET) {
      return NextResponse.next()
    }
  }

  // Protect all /admin paths
  if (pathname.startsWith('/admin/')) {
    const sessionToken = request.cookies.get('admin_session')?.value

    if (!sessionToken) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = `/admin-${ADMIN_SECRET}`
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/admin-(.*)'],
}
