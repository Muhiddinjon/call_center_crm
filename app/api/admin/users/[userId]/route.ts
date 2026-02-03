import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { getUser, updateUser, deleteUser } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    const user = await getUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { fullName, password, isAdmin, isActive } = body;

    const updates: Record<string, unknown> = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) updates.passwordHash = hashPassword(password);

    const updatedUser = await updateUser(userId, updates);

    if (!updatedUser) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      isActive: updatedUser.isActive,
      isAdmin: updatedUser.isAdmin,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    // Prevent deleting yourself
    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: 'O\'zingizni o\'chira olmaysiz' },
        { status: 400 }
      );
    }

    const deleted = await deleteUser(userId);

    if (!deleted) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
