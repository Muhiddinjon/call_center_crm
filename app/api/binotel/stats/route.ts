import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDashboardStats } from '@/lib/binotel';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getDashboardStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Binotel stats error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
