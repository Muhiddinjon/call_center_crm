import { Redis } from '@upstash/redis';
import type { CallLog, User, Session, CallFilters, ReportStats, Topic, DEFAULT_TOPICS } from './types';
import { generateId } from './utils';

// Initialize Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Redis key patterns
export const KEYS = {
  // Calls
  call: (id: string) => `call:${id}`,
  callByCallId: (callId: string) => `call:cid:${callId}`,
  callsByDate: 'calls:by_date',
  callsActive: 'calls:active',
  callsByRegion: (region: string) => `calls:region:${region}`,
  callsByDriver: (driverId: string) => `calls:driver:${driverId}`,
  callsByOperator: (operator: string) => `calls:operator:${operator}`,
  callsByPhone: (phone: string) => `calls:phone:${phone}`,

  // Users
  user: (id: string) => `user:${id}`,
  userByUsername: (username: string) => `user:username:${username}`,
  usersList: 'users:list',

  // Sessions
  session: (token: string) => `session:${token}`,

  // Events
  eventsStream: 'events:stream',

  // Topics
  topic: (id: string) => `topic:${id}`,
  topicsList: 'topics:list',
};

// Helper function to remove null/undefined values for Redis storage
function cleanForRedis(obj: Record<string, unknown>): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        cleaned[key] = JSON.stringify(value);
      } else {
        cleaned[key] = value as string | number | boolean;
      }
    }
  }
  return cleaned;
}

// ============= CALL OPERATIONS =============

export async function createCall(callData: Partial<CallLog>): Promise<CallLog> {
  const now = Date.now();
  const call: CallLog = {
    id: generateId(),
    callId: callData.callId || generateId(),
    phoneNumber: callData.phoneNumber || '',
    internalNumber: callData.internalNumber,
    callType: callData.callType || 'incoming',
    callerType: callData.callerType,
    region: callData.region,
    topic: callData.topic,
    operatorName: callData.operatorName,
    notes: callData.notes,
    isDriver: callData.isDriver || false,
    driverId: callData.driverId,
    driverName: callData.driverName,
    driverCar: callData.driverCar,
    driverRating: callData.driverRating,
    driverStatus: callData.driverStatus,
    driverExtraInfo: callData.driverExtraInfo,
    managerNumber: callData.managerNumber,
    callStart: callData.callStart || now,
    callEnd: callData.callEnd,
    callDuration: callData.callDuration,
    createdAt: now,
    updatedAt: now,
    syncedToSheets: false,
  };

  const pipeline = redis.pipeline();

  // Store call data (cleaned of null values)
  pipeline.hset(KEYS.call(call.id), cleanForRedis(call as unknown as Record<string, unknown>));

  // Index by Binotel call ID
  pipeline.set(KEYS.callByCallId(call.callId), call.id);

  // Add to sorted set by date
  pipeline.zadd(KEYS.callsByDate, { score: call.createdAt, member: call.id });

  // Add to phone index
  pipeline.sadd(KEYS.callsByPhone(call.phoneNumber), call.id);

  // Add to active calls if no end time
  if (!call.callEnd) {
    pipeline.sadd(KEYS.callsActive, call.id);
  }

  await pipeline.exec();

  return call;
}

export async function getCall(id: string): Promise<CallLog | null> {
  const data = await redis.hgetall(KEYS.call(id));
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as CallLog;
}

export async function getCallByCallId(callId: string): Promise<CallLog | null> {
  const id = await redis.get<string>(KEYS.callByCallId(callId));
  if (!id) return null;
  return getCall(id);
}

export async function updateCall(id: string, updates: Partial<CallLog>): Promise<CallLog | null> {
  const existing = await getCall(id);
  if (!existing) return null;

  const updatedCall = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  const pipeline = redis.pipeline();

  // Update call data
  pipeline.hset(KEYS.call(id), cleanForRedis(updatedCall as unknown as Record<string, unknown>));

  // Update region index if changed
  if (updates.region && updates.region !== existing.region) {
    if (existing.region) {
      pipeline.srem(KEYS.callsByRegion(existing.region), id);
    }
    pipeline.sadd(KEYS.callsByRegion(updates.region), id);
  }

  // Update operator index if changed
  if (updates.operatorName && updates.operatorName !== existing.operatorName) {
    if (existing.operatorName) {
      pipeline.srem(KEYS.callsByOperator(existing.operatorName), id);
    }
    pipeline.sadd(KEYS.callsByOperator(updates.operatorName), id);
  }

  // Remove from active if call ended
  if (updates.callEnd) {
    pipeline.srem(KEYS.callsActive, id);
  }

  await pipeline.exec();

  return updatedCall;
}

export async function endCall(callId: string, duration?: number): Promise<CallLog | null> {
  const id = await redis.get<string>(KEYS.callByCallId(callId));
  if (!id) return null;

  return updateCall(id, {
    callEnd: Date.now(),
    callDuration: duration,
  });
}

export async function getActiveCalls(): Promise<CallLog[]> {
  const ids = await redis.smembers(KEYS.callsActive);
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(KEYS.call(id)));
  const results = await pipeline.exec();

  return results.filter(Boolean) as unknown as CallLog[];
}

export async function queryCalls(filters: CallFilters): Promise<CallLog[]> {
  const { dateFrom, dateTo, limit = 50, offset = 0 } = filters;

  let callIds: string[];

  // Get call IDs from sorted set with date range
  if (dateFrom || dateTo) {
    callIds = await redis.zrange(
      KEYS.callsByDate,
      dateFrom || 0,
      dateTo || Date.now(),
      { byScore: true, rev: true, offset, count: limit }
    );
  } else {
    // Get latest calls
    const total = await redis.zcard(KEYS.callsByDate);
    callIds = await redis.zrange(
      KEYS.callsByDate,
      Math.max(0, total - offset - limit),
      total - offset - 1,
      { rev: true }
    );
  }

  if (!callIds || callIds.length === 0) return [];

  // Fetch call data
  const pipeline = redis.pipeline();
  callIds.forEach(id => pipeline.hgetall(KEYS.call(id)));
  const results = await pipeline.exec();

  let calls = results.filter(Boolean) as unknown as CallLog[];

  // Apply additional filters in memory
  if (filters.region) {
    calls = calls.filter(c => c.region === filters.region);
  }
  if (filters.callType) {
    calls = calls.filter(c => c.callType === filters.callType);
  }
  if (filters.callerType) {
    calls = calls.filter(c => c.callerType === filters.callerType);
  }
  if (filters.driverId) {
    calls = calls.filter(c => c.driverId === filters.driverId);
  }
  if (filters.operatorName) {
    calls = calls.filter(c => c.operatorName === filters.operatorName);
  }
  if (filters.phoneNumber) {
    calls = calls.filter(c => c.phoneNumber.includes(filters.phoneNumber!));
  }

  return calls;
}

export async function getCallsByPhone(phoneNumber: string): Promise<CallLog[]> {
  // Get call IDs from phone index
  const ids = await redis.smembers(KEYS.callsByPhone(phoneNumber));
  if (!ids || ids.length === 0) return [];

  // Fetch call data
  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(KEYS.call(id)));
  const results = await pipeline.exec();

  const calls = results.filter(Boolean) as unknown as CallLog[];

  // Sort by date descending
  return calls.sort((a, b) => b.callStart - a.callStart);
}

// Search calls by phone across multiple formats (optimized with parallel queries)
export async function searchCallsByPhone(phone: string): Promise<{
  calls: CallLog[];
  contactInfo: {
    phoneNumber: string;
    isDriver: boolean;
    driverInfo?: {
      driverId?: string;
      driverName?: string;
      driverCar?: string;
      driverRating?: string;
      driverStatus?: string;
      managerNumber?: string;
    };
    totalCalls: number;
    lastCall?: number;
  };
}> {
  // Import utils for phone search variants
  const { getPhoneSearchVariants } = await import('./utils');
  const variants = getPhoneSearchVariants(phone);

  // Get all call IDs from all phone variants in parallel using pipeline
  const pipeline = redis.pipeline();
  variants.forEach(variant => {
    pipeline.smembers(KEYS.callsByPhone(variant));
  });
  const variantResults = await pipeline.exec();

  // Collect all unique call IDs
  const allIds = new Set<string>();
  variantResults.forEach(ids => {
    if (Array.isArray(ids)) {
      ids.forEach(id => allIds.add(id as string));
    }
  });

  if (allIds.size === 0) {
    return {
      calls: [],
      contactInfo: {
        phoneNumber: phone,
        isDriver: false,
        totalCalls: 0,
      },
    };
  }

  // Fetch all call data in parallel using pipeline
  const callPipeline = redis.pipeline();
  allIds.forEach(id => callPipeline.hgetall(KEYS.call(id)));
  const callResults = await callPipeline.exec();

  const calls = (callResults.filter(Boolean) as unknown as CallLog[])
    .sort((a, b) => b.callStart - a.callStart);

  // Extract contact info from most recent driver call
  const driverCall = calls.find(c => c.isDriver);
  const mostRecentCall = calls[0];

  return {
    calls,
    contactInfo: {
      phoneNumber: mostRecentCall?.phoneNumber || phone,
      isDriver: !!driverCall,
      driverInfo: driverCall ? {
        driverId: driverCall.driverId,
        driverName: driverCall.driverName,
        driverCar: driverCall.driverCar,
        driverRating: driverCall.driverRating,
        driverStatus: driverCall.driverStatus,
        managerNumber: driverCall.managerNumber,
      } : undefined,
      totalCalls: calls.length,
      lastCall: mostRecentCall?.callStart,
    },
  };
}

export async function getCallStats(filters: CallFilters): Promise<ReportStats> {
  const calls = await queryCalls({ ...filters, limit: 10000 });

  const stats: ReportStats = {
    totalCalls: calls.length,
    incomingCalls: calls.filter(c => c.callType === 'incoming').length,
    outgoingCalls: calls.filter(c => c.callType === 'outgoing').length,
    driverCalls: calls.filter(c => c.isDriver).length,
    clientCalls: calls.filter(c => !c.isDriver).length,
    avgDuration: calls.length > 0
      ? calls.reduce((sum, c) => sum + (c.callDuration || 0), 0) / calls.length
      : 0,
    byRegion: {},
    byOperator: {},
  };

  // Count by region
  calls.forEach(call => {
    if (call.region) {
      stats.byRegion[call.region] = (stats.byRegion[call.region] || 0) + 1;
    }
    if (call.operatorName) {
      stats.byOperator[call.operatorName] = (stats.byOperator[call.operatorName] || 0) + 1;
    }
  });

  return stats;
}

// ============= USER OPERATIONS =============

export async function createUser(userData: {
  username: string;
  passwordHash: string;
  fullName?: string;
  isAdmin?: boolean;
}): Promise<User> {
  const now = Date.now();
  const user: User = {
    id: generateId(),
    username: userData.username,
    passwordHash: userData.passwordHash,
    fullName: userData.fullName,
    isActive: true,
    isAdmin: userData.isAdmin || false,
    createdAt: now,
  };

  const pipeline = redis.pipeline();
  pipeline.hset(KEYS.user(user.id), cleanForRedis(user as unknown as Record<string, unknown>));
  pipeline.set(KEYS.userByUsername(user.username), user.id);
  pipeline.sadd(KEYS.usersList, user.id);
  await pipeline.exec();

  return user;
}

export async function getUser(id: string): Promise<User | null> {
  const data = await redis.hgetall(KEYS.user(id));
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as User;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const id = await redis.get<string>(KEYS.userByUsername(username));
  if (!id) return null;
  return getUser(id);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const existing = await getUser(id);
  if (!existing) return null;

  const updatedUser = { ...existing, ...updates };
  await redis.hset(KEYS.user(id), cleanForRedis(updatedUser as unknown as Record<string, unknown>));

  return updatedUser;
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = await getUser(id);
  if (!user) return false;

  const pipeline = redis.pipeline();
  pipeline.del(KEYS.user(id));
  pipeline.del(KEYS.userByUsername(user.username));
  pipeline.srem(KEYS.usersList, id);
  await pipeline.exec();

  return true;
}

export async function getAllUsers(): Promise<User[]> {
  const ids = await redis.smembers(KEYS.usersList);
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(KEYS.user(id)));
  const results = await pipeline.exec();

  return results.filter(Boolean) as unknown as User[];
}

// ============= SESSION OPERATIONS =============

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export async function createSession(user: User, token: string): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
    createdAt: now,
    expiresAt: now + SESSION_TTL * 1000,
  };

  await redis.hset(KEYS.session(token), cleanForRedis(session as unknown as Record<string, unknown>));
  await redis.expire(KEYS.session(token), SESSION_TTL);

  return session;
}

export async function getSession(token: string): Promise<Session | null> {
  const data = await redis.hgetall(KEYS.session(token));
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as Session;
}

export async function deleteSession(token: string): Promise<void> {
  await redis.del(KEYS.session(token));
}

// ============= EVENTS =============

export async function publishEvent(event: { type: string; data: unknown }): Promise<void> {
  await redis.xadd(KEYS.eventsStream, '*', {
    type: event.type,
    data: JSON.stringify(event.data),
    timestamp: Date.now().toString(),
  });

  // Keep only last 1000 events
  await redis.xtrim(KEYS.eventsStream, { strategy: 'MAXLEN', threshold: 1000 });
}

export async function getRecentEvents(lastId = '0'): Promise<Array<{ id: string; type: string; data: unknown }>> {
  try {
    // Use xrange to get events after lastId
    const events = await redis.xrange(KEYS.eventsStream, lastId === '0' ? '-' : `(${lastId}`, '+', 100) as unknown as Array<[string, Record<string, string>]>;

    if (!events || !Array.isArray(events) || events.length === 0) return [];

    return events.map((entry) => {
      const [id, fields] = entry;
      return {
        id,
        type: fields?.type || 'unknown',
        data: fields?.data ? JSON.parse(fields.data) : null,
      };
    });
  } catch (error) {
    console.error('getRecentEvents error:', error);
    return [];
  }
}

// ============= TOPIC OPERATIONS =============

export async function createTopic(name: string): Promise<Topic> {
  const now = Date.now();
  const existingTopics = await getAllTopics();

  const topic: Topic = {
    id: generateId(),
    name,
    isActive: true,
    order: existingTopics.length,
    createdAt: now,
  };

  const pipeline = redis.pipeline();
  pipeline.hset(KEYS.topic(topic.id), cleanForRedis(topic as unknown as Record<string, unknown>));
  pipeline.sadd(KEYS.topicsList, topic.id);
  await pipeline.exec();

  return topic;
}

export async function getTopic(id: string): Promise<Topic | null> {
  const data = await redis.hgetall(KEYS.topic(id));
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as Topic;
}

export async function updateTopic(id: string, updates: Partial<Topic>): Promise<Topic | null> {
  const existing = await getTopic(id);
  if (!existing) return null;

  const updatedTopic = { ...existing, ...updates };
  await redis.hset(KEYS.topic(id), cleanForRedis(updatedTopic as unknown as Record<string, unknown>));

  return updatedTopic;
}

export async function deleteTopic(id: string): Promise<boolean> {
  const topic = await getTopic(id);
  if (!topic) return false;

  const pipeline = redis.pipeline();
  pipeline.del(KEYS.topic(id));
  pipeline.srem(KEYS.topicsList, id);
  await pipeline.exec();

  return true;
}

export async function getAllTopics(): Promise<Topic[]> {
  const ids = await redis.smembers(KEYS.topicsList);
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(KEYS.topic(id)));
  const results = await pipeline.exec();

  const topics = results.filter(Boolean) as unknown as Topic[];
  return topics.sort((a, b) => a.order - b.order);
}

export async function getActiveTopics(): Promise<Topic[]> {
  const topics = await getAllTopics();
  return topics.filter(t => t.isActive);
}

// ============= INITIALIZATION =============

export async function initializeDefaultUsers(): Promise<void> {
  const adminExists = await getUserByUsername('admin');
  if (!adminExists) {
    const crypto = await import('crypto');
    await createUser({
      username: 'admin',
      passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
      fullName: 'Administrator',
      isAdmin: true,
    });
  }

  const operatorExists = await getUserByUsername('operator');
  if (!operatorExists) {
    const crypto = await import('crypto');
    await createUser({
      username: 'operator',
      passwordHash: crypto.createHash('sha256').update('operator123').digest('hex'),
      fullName: 'Operator',
      isAdmin: false,
    });
  }
}

export async function initializeDefaultTopics(): Promise<void> {
  const existingTopics = await getAllTopics();
  if (existingTopics.length === 0) {
    const { DEFAULT_TOPICS } = await import('./types');
    for (const topicName of DEFAULT_TOPICS) {
      await createTopic(topicName);
    }
  }
}
