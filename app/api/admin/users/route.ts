import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { getAllUsers, createUser, getUserByUsername } from '@/lib/redis';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await getAllUsers();

    // Remove password hashes from response
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      isActive: u.isActive,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, fullName, isAdmin } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username va parol kiritilishi shart' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu username allaqachon mavjud' },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      username,
      passwordHash: hashPassword(password),
      fullName,
      isAdmin: isAdmin || false,
    });

    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      isAdmin: newUser.isAdmin,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
