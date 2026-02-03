import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Avtorizatsiya qilinmagan' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.userId,
      username: user.username,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
