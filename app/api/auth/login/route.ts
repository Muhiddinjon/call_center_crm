import { NextRequest, NextResponse } from 'next/server';
import { authenticate, generateToken } from '@/lib/auth';
import { initializeDefaultUsers } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // Ensure default users exist
    await initializeDefaultUsers();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username va parol kiritilishi shart' },
        { status: 400 }
      );
    }

    const user = await authenticate(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    const token = await generateToken(user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
    });

    // Set cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
