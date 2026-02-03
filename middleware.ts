import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Public paths that don't require auth
  const publicPaths = ['/login', '/api/webhook/binotel', '/api/auth/login', '/api/debug'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // API routes that require auth
  const isApiRoute = pathname.startsWith('/api');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  // Allow public paths
  if (isPublicPath) {
    // Redirect to dashboard if already logged in and trying to access login
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Check authentication
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For admin routes, we'll check the role in the API handlers
  // This is because middleware can't easily verify JWT without crypto APIs

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
