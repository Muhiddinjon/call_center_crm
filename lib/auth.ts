import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import {
  getUserByUsername,
  updateUser,
  createSession,
  getSession,
  deleteSession,
} from './redis';
import type { User, Session } from './types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function authenticate(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) return null;

  if (!user.isActive) return null;

  // Update last login
  await updateUser(user.id, { lastLogin: Date.now() });

  return user;
}

export async function generateToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  // Store session in Redis
  await createSession(user, token);

  return token;
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    await jwtVerify(token, JWT_SECRET);
    const session = await getSession(token);
    return session;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) return null;
  return verifyToken(token);
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}

export { type User, type Session };
