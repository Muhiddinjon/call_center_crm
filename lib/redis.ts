import { Redis } from '@upstash/redis';
import type { CallLog, User, Session, CallFilters, ReportStats, Topic, Contact, OperatorStats, MissedCall, MissedCallStatus, Shift, ShiftFilters, ShiftReport, ShiftDetail, ShiftCoverage } from './types';
import { generateId, getTashkentDateString, getTashkentHour, getTashkentStartOfDay, getTashkentEndOfDay, getHourInTashkent, normalizePhone, getPhoneSearchVariants } from './utils';
import crypto from 'crypto';

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

  // Contacts (saved caller names)
  contact: (phone: string) => `contact:${phone}`,
  contactsList: 'contacts:list',

  // Missed calls
  missedCalls: 'calls:missed',
  missedRoundRobinIndex: 'missed:round_robin_index',
  missedAssigned: (userId: string) => `missed:assigned:${userId}`,

  // Shifts
  shift: (id: string) => `shift:${id}`,
  shiftsByDate: (date: string) => `shifts:date:${date}`,
  shiftsByUser: (userId: string) => `shifts:user:${userId}`,
  shiftsList: 'shifts:list',
  shiftCoverage: (date: string, hour: number) => `shifts:coverage:${date}:${hour}`,
};

// Helper function to remove null/undefined values for Redis storage
function cleanForRedis<T extends Record<string, unknown>>(obj: T): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        cleaned[key] = JSON.stringify(value);
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// Type-safe Redis hash parser
function parseRedisHash<T>(data: Record<string, unknown> | null): T | null {
  if (!data || Object.keys(data).length === 0) return null;

  // Parse JSON strings back to objects where needed
  const parsed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Try to parse JSON strings
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          parsed[key] = JSON.parse(value);
        } catch {
          parsed[key] = value;
        }
      } else if (value === 'true') {
        parsed[key] = true;
      } else if (value === 'false') {
        parsed[key] = false;
      } else if (!isNaN(Number(value)) && value !== '') {
        // Check if it's a number
        parsed[key] = Number(value);
      } else {
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  }

  return parsed as T;
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
  return parseRedisHash<CallLog>(data);
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
    // Use zrange with byScore option for date range queries
    const minScore = dateFrom || 0;
    const maxScore = dateTo || Date.now();

    // Get all IDs in the score range using zrange with byScore
    const allIds = await redis.zrange(KEYS.callsByDate, minScore, maxScore, {
      byScore: true,
    }) as string[];

    // Reverse for newest first, then apply offset and limit
    const reversedIds = [...allIds].reverse();
    callIds = reversedIds.slice(offset, offset + limit);
  } else {
    // Get latest calls - use negative indices for reverse order
    const allIds = await redis.zrange(KEYS.callsByDate, 0, -1) as string[];
    const reversedIds = [...allIds].reverse();
    callIds = reversedIds.slice(offset, offset + limit);
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
  return parseRedisHash<User>(data);
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
  return parseRedisHash<Session>(data);
}

export async function deleteSession(token: string): Promise<void> {
  await redis.del(KEYS.session(token));
}

// ============= EVENTS =============

export async function publishEvent(event: { type: string; data: unknown }): Promise<void> {
  try {
    const eventId = await redis.xadd(KEYS.eventsStream, '*', {
      type: event.type,
      data: JSON.stringify(event.data),
      timestamp: Date.now().toString(),
    });

    console.log(`[Event] Published ${event.type} with ID: ${eventId}`);

    // Keep only last 1000 events
    await redis.xtrim(KEYS.eventsStream, { strategy: 'MAXLEN', threshold: 1000 });
  } catch (error) {
    console.error(`[Event] Failed to publish ${event.type}:`, error);
    throw error;
  }
}

export async function getRecentEvents(lastId = '0'): Promise<Array<{ id: string; type: string; data: unknown }>> {
  try {
    // Use xrange to get events after lastId
    // For new connections, start from current time to avoid replaying old events
    const startId = lastId === '0' ? `${Date.now() - 60000}-0` : `(${lastId}`;
    const rawEvents = await redis.xrange(KEYS.eventsStream, startId, '+', 100);

    if (!rawEvents) return [];

    const result: Array<{ id: string; type: string; data: unknown }> = [];

    // Upstash xrange returns an OBJECT format: { "id": { type, data, timestamp }, ... }
    // Not an array like standard Redis
    if (typeof rawEvents === 'object' && !Array.isArray(rawEvents)) {
      // Handle Upstash object format: { "1770127548736-0": { type, data, timestamp }, ... }
      for (const [eventId, fields] of Object.entries(rawEvents)) {
        try {
          if (!eventId || !fields || typeof fields !== 'object') continue;

          const fieldObj = fields as Record<string, unknown>;
          const eventType = (fieldObj.type as string) || 'unknown';
          let eventData: unknown = null;

          if (fieldObj.data) {
            try {
              eventData = typeof fieldObj.data === 'string' ? JSON.parse(fieldObj.data) : fieldObj.data;
            } catch {
              eventData = fieldObj.data;
            }
          }

          result.push({ id: eventId, type: eventType, data: eventData });
        } catch (parseError) {
          console.warn('Failed to parse event entry:', parseError);
        }
      }
    } else if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      // Handle standard Redis array format: [[id, {fields}], ...]
      for (const entry of rawEvents) {
        try {
          let id: string;
          let fields: Record<string, string>;

          if (Array.isArray(entry) && entry.length >= 2) {
            // Format: [id, {type, data, timestamp}]
            [id, fields] = entry as [string, Record<string, string>];
          } else if (typeof entry === 'object' && entry !== null) {
            // Format: {id, type, data, timestamp}
            const obj = entry as Record<string, unknown>;
            if ('id' in obj && typeof obj.id === 'string') {
              id = obj.id;
              fields = obj as unknown as Record<string, string>;
            } else {
              continue;
            }
          } else {
            continue;
          }

          if (!id || !fields) continue;

          const eventType = fields.type || 'unknown';
          let eventData: unknown = null;

          if (fields.data) {
            try {
              eventData = typeof fields.data === 'string' ? JSON.parse(fields.data) : fields.data;
            } catch {
              eventData = fields.data;
            }
          }

          result.push({ id, type: eventType, data: eventData });
        } catch (parseError) {
          console.warn('Failed to parse event entry:', parseError);
        }
      }
    }

    return result;
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
  return parseRedisHash<Topic>(data);
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
    await createUser({
      username: 'admin',
      passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
      fullName: 'Administrator',
      isAdmin: true,
    });
  }

  const operatorExists = await getUserByUsername('operator');
  if (!operatorExists) {
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
    // Default topics for call center
    const defaultTopics = [
      'Buyurtma',
      'Shikoyat',
      'Ma\'lumot',
      'Texnik yordam',
      'Boshqa',
    ];
    for (const topicName of defaultTopics) {
      await createTopic(topicName);
    }
  }
}

// ============= CONTACT OPERATIONS =============

export async function saveContact(phoneNumber: string, name: string, notes?: string, createdBy?: string): Promise<Contact> {
  const normalizedPhone = normalizePhone(phoneNumber);
  const now = Date.now();

  const existing = await getContact(normalizedPhone);

  const contact: Contact = {
    phoneNumber: normalizedPhone,
    name,
    notes: notes || existing?.notes,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    createdBy: createdBy || existing?.createdBy,
  };

  const pipeline = redis.pipeline();
  pipeline.hset(KEYS.contact(normalizedPhone), cleanForRedis(contact as unknown as Record<string, unknown>));
  pipeline.sadd(KEYS.contactsList, normalizedPhone);
  await pipeline.exec();

  return contact;
}

export async function getContact(phoneNumber: string): Promise<Contact | null> {
  const normalizedPhone = normalizePhone(phoneNumber);

  // Try exact match first
  let data = await redis.hgetall(KEYS.contact(normalizedPhone));
  if (data && Object.keys(data).length > 0) {
    return data as unknown as Contact;
  }

  // Try variants
  const variants = getPhoneSearchVariants(phoneNumber);
  for (const variant of variants) {
    data = await redis.hgetall(KEYS.contact(variant));
    if (data && Object.keys(data).length > 0) {
      return data as unknown as Contact;
    }
  }

  return null;
}

export async function deleteContact(phoneNumber: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phoneNumber);

  const pipeline = redis.pipeline();
  pipeline.del(KEYS.contact(normalizedPhone));
  pipeline.srem(KEYS.contactsList, normalizedPhone);
  await pipeline.exec();

  return true;
}

export async function getAllContacts(): Promise<Contact[]> {
  const phones = await redis.smembers(KEYS.contactsList);
  if (!phones || phones.length === 0) return [];

  const pipeline = redis.pipeline();
  phones.forEach(phone => pipeline.hgetall(KEYS.contact(phone)));
  const results = await pipeline.exec();

  return results.filter(Boolean) as unknown as Contact[];
}

export async function searchContacts(query: string): Promise<Contact[]> {
  const contacts = await getAllContacts();
  const lowerQuery = query.toLowerCase();

  return contacts.filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.phoneNumber.includes(query)
  );
}

// ============= MISSED CALLS OPERATIONS =============

export async function addMissedCall(call: CallLog, autoAssign = true): Promise<MissedCall> {
  const missedCall: MissedCall = {
    id: call.id,
    callId: call.callId,
    phoneNumber: call.phoneNumber,
    callStart: call.callStart,
    internalNumber: call.internalNumber,
    isDriver: call.isDriver === true || call.isDriver === 'true',
    driverName: call.driverName,
    status: 'pending',
  };

  // Get contact name if exists
  const contact = await getContact(call.phoneNumber);
  if (contact) {
    missedCall.contactName = contact.name;
  }

  // Auto-assign to operator on shift (round-robin)
  if (autoAssign) {
    const assignment = await assignMissedCallToOperator(missedCall);
    if (assignment) {
      missedCall.assignedTo = assignment.userId;
      missedCall.assignedOperator = assignment.operatorName;
      missedCall.assignedAt = Date.now();
      missedCall.status = 'assigned';
    }
  }

  await redis.zadd(KEYS.missedCalls, {
    score: call.callStart,
    member: JSON.stringify(missedCall)
  });

  return missedCall;
}

// Round-robin assignment for missed calls
export async function assignMissedCallToOperator(missedCall: MissedCall): Promise<{
  userId: string;
  operatorName: string;
} | null> {
  const now = Date.now();
  // Get current date and hour in Tashkent timezone
  const today = getTashkentDateString();
  const currentHour = getTashkentHour();

  // 1. Get operators on duty right now
  const onDutyUserIds = await redis.smembers(KEYS.shiftCoverage(today, currentHour)) as string[];
  if (!onDutyUserIds || onDutyUserIds.length === 0) {
    // No one on shift, don't assign
    return null;
  }

  // 2. Get current round-robin index
  let index = parseInt(await redis.get(KEYS.missedRoundRobinIndex) as string || '0');

  // 3. Select next operator (round-robin)
  index = (index + 1) % onDutyUserIds.length;
  const assignedUserId = onDutyUserIds[index];

  // 4. Save new index
  await redis.set(KEYS.missedRoundRobinIndex, index.toString());

  // 5. Get operator name
  const user = await getUser(assignedUserId);
  const operatorName = user?.fullName || user?.username || 'Noma\'lum';

  // 6. Add to operator's assigned missed calls
  await redis.zadd(KEYS.missedAssigned(assignedUserId), {
    score: now,
    member: missedCall.id
  });

  return { userId: assignedUserId, operatorName };
}

// Get missed calls assigned to a specific operator
export async function getMissedCallsForOperator(userId: string): Promise<MissedCall[]> {
  // Get assigned call IDs
  const assignedIds = await redis.zrange(KEYS.missedAssigned(userId), 0, -1, { rev: true }) as string[];
  if (!assignedIds || assignedIds.length === 0) return [];

  // Get all missed calls and filter by assigned IDs
  const allMissedCalls = await getMissedCalls(1000);
  return allMissedCalls.filter(mc =>
    assignedIds.includes(mc.id) && mc.status !== 'resolved'
  );
}

// Update missed call status
export async function updateMissedCallStatus(
  callId: string,
  status: MissedCallStatus,
  operatorName?: string
): Promise<MissedCall | null> {
  const missedCalls = await getMissedCalls(1000);
  const missedCall = missedCalls.find(c => c.callId === callId || c.id === callId);

  if (!missedCall) return null;

  // Remove old entry
  await redis.zrem(KEYS.missedCalls, JSON.stringify(missedCall));

  // Update fields
  missedCall.status = status;
  if (status === 'called_back' || status === 'resolved') {
    missedCall.callbackAt = Date.now();
    if (operatorName) {
      missedCall.callbackBy = operatorName;
    }
  }

  // Add updated entry
  await redis.zadd(KEYS.missedCalls, {
    score: missedCall.callStart,
    member: JSON.stringify(missedCall)
  });

  // If resolved, remove from operator's assigned list
  if (status === 'resolved' && missedCall.assignedTo) {
    await redis.zrem(KEYS.missedAssigned(missedCall.assignedTo), missedCall.id);
  }

  return missedCall;
}

export async function getMissedCalls(limit = 50): Promise<MissedCall[]> {
  const results = await redis.zrange(KEYS.missedCalls, 0, limit - 1, { rev: true });

  return results.map(item => {
    if (typeof item === 'string') {
      return JSON.parse(item) as MissedCall;
    }
    return item as unknown as MissedCall;
  });
}

export async function markMissedCallAsCallback(callId: string, operatorName: string): Promise<void> {
  await updateMissedCallStatus(callId, 'called_back', operatorName);
}

export async function removeMissedCall(callId: string): Promise<void> {
  const missedCalls = await getMissedCalls(1000);
  const missedCall = missedCalls.find(c => c.callId === callId || c.id === callId);

  if (missedCall) {
    await redis.zrem(KEYS.missedCalls, JSON.stringify(missedCall));
  }
}

export async function getUnhandledMissedCalls(): Promise<MissedCall[]> {
  const missedCalls = await getMissedCalls(1000);
  return missedCalls.filter(c => c.status === 'pending' || c.status === 'assigned');
}

// ============= OPERATOR STATISTICS =============

export async function getOperatorStats(filters: CallFilters): Promise<OperatorStats[]> {
  const calls = await queryCalls({ ...filters, limit: 10000 });

  // Group by operator
  const operatorMap = new Map<string, {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    totalDuration: number;
  }>();

  calls.forEach(call => {
    const operator = call.operatorName || 'Noma\'lum';

    if (!operatorMap.has(operator)) {
      operatorMap.set(operator, {
        totalCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        totalDuration: 0,
      });
    }

    const stats = operatorMap.get(operator)!;
    stats.totalCalls++;

    if (call.callEnd && call.callDuration && call.callDuration > 0) {
      stats.answeredCalls++;
      stats.totalDuration += call.callDuration;
    } else if (call.callEnd && (!call.callDuration || call.callDuration === 0)) {
      stats.missedCalls++;
    }
  });

  // Convert to array
  const result: OperatorStats[] = [];
  operatorMap.forEach((stats, operatorName) => {
    result.push({
      operatorName,
      totalCalls: stats.totalCalls,
      answeredCalls: stats.answeredCalls,
      missedCalls: stats.missedCalls,
      totalDuration: stats.totalDuration,
      avgDuration: stats.answeredCalls > 0
        ? Math.round(stats.totalDuration / stats.answeredCalls)
        : 0,
      answerRate: stats.totalCalls > 0
        ? Math.round((stats.answeredCalls / stats.totalCalls) * 100)
        : 0,
    });
  });

  // Sort by total calls descending
  return result.sort((a, b) => b.totalCalls - a.totalCalls);
}

export async function getDailyStats(dateStr?: string): Promise<{
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  byHour: Record<number, number>;
}> {
  // Use Tashkent timezone for date calculations
  const targetDate = dateStr || getTashkentDateString();
  const startOfDay = getTashkentStartOfDay(targetDate);
  const endOfDay = getTashkentEndOfDay(targetDate);

  const calls = await queryCalls({
    dateFrom: startOfDay,
    dateTo: endOfDay,
    limit: 10000,
  });

  let answeredCalls = 0;
  let missedCalls = 0;
  let totalDuration = 0;
  const byHour: Record<number, number> = {};

  // Initialize hours
  for (let i = 0; i < 24; i++) {
    byHour[i] = 0;
  }

  calls.forEach(call => {
    // Get hour in Tashkent timezone
    const hour = getHourInTashkent(call.callStart);
    byHour[hour]++;

    if (call.callEnd && call.callDuration && call.callDuration > 0) {
      answeredCalls++;
      totalDuration += call.callDuration;
    } else if (call.callEnd) {
      missedCalls++;
    }
  });

  return {
    totalCalls: calls.length,
    answeredCalls,
    missedCalls,
    avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
    byHour,
  };
}

// ============= SHIFT OPERATIONS =============

function calculateShiftTimestamps(date: string, startTime: string, endTime: string): {
  startTimestamp: number;
  endTimestamp: number;
} {
  // Parse date and times in Tashkent timezone (UTC+5)
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startDate = new Date(`${date}T${startTime}:00+05:00`);
  let endDate = new Date(`${date}T${endTime}:00+05:00`);

  // Handle overnight shifts (e.g., 22:00 - 06:00)
  if (endH < startH || (endH === startH && endM < startM)) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return {
    startTimestamp: startDate.getTime(),
    endTimestamp: endDate.getTime(),
  };
}

export function calculateShiftHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24; // Overnight shift
  return hours;
}

export async function createShift(data: {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  createdBy: string;
}): Promise<Shift> {
  const now = Date.now();
  const { startTimestamp, endTimestamp } = calculateShiftTimestamps(data.date, data.startTime, data.endTime);

  // Get operator name
  const user = await getUser(data.userId);
  const operatorName = user?.fullName || user?.username || 'Noma\'lum';

  const shift: Shift = {
    id: generateId(),
    userId: data.userId,
    operatorName,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    startTimestamp,
    endTimestamp,
    status: 'scheduled',
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
  };

  const pipeline = redis.pipeline();

  // Store shift data
  pipeline.hset(KEYS.shift(shift.id), cleanForRedis(shift as unknown as Record<string, unknown>));

  // Add to shifts list
  pipeline.sadd(KEYS.shiftsList, shift.id);

  // Index by date (sorted by start timestamp)
  pipeline.zadd(KEYS.shiftsByDate(data.date), { score: startTimestamp, member: shift.id });

  // Index by user (sorted by start timestamp)
  pipeline.zadd(KEYS.shiftsByUser(data.userId), { score: startTimestamp, member: shift.id });

  // Update coverage index for each hour
  const [startH] = data.startTime.split(':').map(Number);
  const [endH] = data.endTime.split(':').map(Number);
  const hours = endH > startH
    ? Array.from({ length: endH - startH }, (_, i) => startH + i)
    : [...Array.from({ length: 24 - startH }, (_, i) => startH + i), ...Array.from({ length: endH }, (_, i) => i)];

  hours.forEach(hour => {
    pipeline.sadd(KEYS.shiftCoverage(data.date, hour), data.userId);
  });

  await pipeline.exec();

  return shift;
}

export async function getShift(id: string): Promise<Shift | null> {
  const data = await redis.hgetall(KEYS.shift(id));
  return parseRedisHash<Shift>(data);
}

export async function updateShift(id: string, updates: Partial<Shift>): Promise<Shift | null> {
  const existing = await getShift(id);
  if (!existing) return null;

  const now = Date.now();

  // Recalculate timestamps if time changed
  let timestamps = {};
  if (updates.startTime || updates.endTime || updates.date) {
    const date = updates.date || existing.date;
    const startTime = updates.startTime || existing.startTime;
    const endTime = updates.endTime || existing.endTime;
    timestamps = calculateShiftTimestamps(date, startTime, endTime);
  }

  const updatedShift: Shift = {
    ...existing,
    ...updates,
    ...timestamps,
    updatedAt: now,
  };

  const pipeline = redis.pipeline();

  // Update shift data
  pipeline.hset(KEYS.shift(id), cleanForRedis(updatedShift as unknown as Record<string, unknown>));

  // If date changed, update date indexes
  if (updates.date && updates.date !== existing.date) {
    pipeline.zrem(KEYS.shiftsByDate(existing.date), id);
    pipeline.zadd(KEYS.shiftsByDate(updates.date), { score: updatedShift.startTimestamp, member: id });

    // Update coverage indexes
    const [oldStartH] = existing.startTime.split(':').map(Number);
    const [oldEndH] = existing.endTime.split(':').map(Number);
    const oldHours = oldEndH > oldStartH
      ? Array.from({ length: oldEndH - oldStartH }, (_, i) => oldStartH + i)
      : [...Array.from({ length: 24 - oldStartH }, (_, i) => oldStartH + i), ...Array.from({ length: oldEndH }, (_, i) => i)];

    oldHours.forEach(hour => {
      pipeline.srem(KEYS.shiftCoverage(existing.date, hour), existing.userId);
    });

    const [newStartH] = updatedShift.startTime.split(':').map(Number);
    const [newEndH] = updatedShift.endTime.split(':').map(Number);
    const newHours = newEndH > newStartH
      ? Array.from({ length: newEndH - newStartH }, (_, i) => newStartH + i)
      : [...Array.from({ length: 24 - newStartH }, (_, i) => newStartH + i), ...Array.from({ length: newEndH }, (_, i) => i)];

    newHours.forEach(hour => {
      pipeline.sadd(KEYS.shiftCoverage(updatedShift.date, hour), updatedShift.userId);
    });
  }

  await pipeline.exec();

  return updatedShift;
}

export async function deleteShift(id: string): Promise<boolean> {
  const shift = await getShift(id);
  if (!shift) return false;

  const pipeline = redis.pipeline();

  // Delete shift data
  pipeline.del(KEYS.shift(id));

  // Remove from list
  pipeline.srem(KEYS.shiftsList, id);

  // Remove from date index
  pipeline.zrem(KEYS.shiftsByDate(shift.date), id);

  // Remove from user index
  pipeline.zrem(KEYS.shiftsByUser(shift.userId), id);

  // Remove from coverage indexes
  const [startH] = shift.startTime.split(':').map(Number);
  const [endH] = shift.endTime.split(':').map(Number);
  const hours = endH > startH
    ? Array.from({ length: endH - startH }, (_, i) => startH + i)
    : [...Array.from({ length: 24 - startH }, (_, i) => startH + i), ...Array.from({ length: endH }, (_, i) => i)];

  hours.forEach(hour => {
    pipeline.srem(KEYS.shiftCoverage(shift.date, hour), shift.userId);
  });

  await pipeline.exec();

  return true;
}

export async function getShiftsByDate(date: string): Promise<Shift[]> {
  const ids = await redis.zrange(KEYS.shiftsByDate(date), 0, -1) as string[];
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(KEYS.shift(id)));
  const results = await pipeline.exec();

  return results.filter(Boolean) as unknown as Shift[];
}

export async function getShiftsByUser(userId: string, dateFrom?: string, dateTo?: string): Promise<Shift[]> {
  let ids: string[];

  if (dateFrom || dateTo) {
    const minScore = dateFrom ? new Date(`${dateFrom}T00:00:00+05:00`).getTime() : 0;
    const maxScore = dateTo ? new Date(`${dateTo}T23:59:59+05:00`).getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000;

    ids = await redis.zrange(KEYS.shiftsByUser(userId), minScore, maxScore, { byScore: true }) as string[];
  } else {
    ids = await redis.zrange(KEYS.shiftsByUser(userId), 0, -1) as string[];
  }

  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(KEYS.shift(id)));
  const results = await pipeline.exec();

  return results.filter(Boolean) as unknown as Shift[];
}

export async function queryShifts(filters: ShiftFilters): Promise<Shift[]> {
  const { userId, dateFrom, dateTo, status, limit = 100, offset = 0 } = filters;

  let shifts: Shift[] = [];

  if (userId) {
    shifts = await getShiftsByUser(userId, dateFrom, dateTo);
  } else if (dateFrom || dateTo) {
    // Get all shifts in date range
    const allIds = await redis.smembers(KEYS.shiftsList);
    if (allIds && allIds.length > 0) {
      const pipeline = redis.pipeline();
      allIds.forEach(id => pipeline.hgetall(KEYS.shift(id)));
      const results = await pipeline.exec();
      shifts = results.filter(Boolean) as unknown as Shift[];

      // Filter by date
      const minDate = dateFrom || '1970-01-01';
      const maxDate = dateTo || '2100-12-31';
      shifts = shifts.filter(s => s.date >= minDate && s.date <= maxDate);
    }
  } else {
    // Get all shifts
    const allIds = await redis.smembers(KEYS.shiftsList);
    if (allIds && allIds.length > 0) {
      const pipeline = redis.pipeline();
      allIds.forEach(id => pipeline.hgetall(KEYS.shift(id)));
      const results = await pipeline.exec();
      shifts = results.filter(Boolean) as unknown as Shift[];
    }
  }

  // Apply status filter
  if (status) {
    shifts = shifts.filter(s => s.status === status);
  }

  // Sort by date descending
  shifts.sort((a, b) => b.date.localeCompare(a.date) || b.startTimestamp - a.startTimestamp);

  // Apply pagination
  return shifts.slice(offset, offset + limit);
}

export async function getShiftCoverage(date: string): Promise<ShiftCoverage[]> {
  const coverage: ShiftCoverage[] = [];

  // Get all users for name lookup
  const users = await getAllUsers();
  const userMap = new Map(users.map(u => [u.id, u.fullName || u.username]));

  // Get calls for this date
  const startOfDay = new Date(`${date}T00:00:00+05:00`).getTime();
  const endOfDay = new Date(`${date}T23:59:59+05:00`).getTime();
  const calls = await queryCalls({ dateFrom: startOfDay, dateTo: endOfDay, limit: 10000 });

  for (let hour = 0; hour < 24; hour++) {
    const userIds = await redis.smembers(KEYS.shiftCoverage(date, hour)) as string[];

    // Get calls for this hour
    const hourStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00+05:00`).getTime();
    const hourEnd = hourStart + 60 * 60 * 1000;
    const hourCalls = calls.filter(c => c.callStart >= hourStart && c.callStart < hourEnd);
    const answeredCalls = hourCalls.filter(c => c.callDuration && c.callDuration > 0);
    const missedCalls = hourCalls.filter(c => c.callEnd && (!c.callDuration || c.callDuration === 0));

    coverage.push({
      hour,
      operators: userIds.map(id => ({
        userId: id,
        operatorName: userMap.get(id) || 'Noma\'lum',
      })),
      callCount: hourCalls.length,
      answeredCount: answeredCalls.length,
      missedCount: missedCalls.length,
      coverageStatus: userIds.length >= 2 ? 'covered' : userIds.length === 1 ? 'partial' : 'uncovered',
    });
  }

  return coverage;
}

export async function getShiftReport(userId: string, dateFrom: string, dateTo: string): Promise<ShiftReport> {
  const shifts = await getShiftsByUser(userId, dateFrom, dateTo);
  const user = await getUser(userId);
  const operatorName = user?.fullName || user?.username || 'Noma\'lum';

  let totalHoursScheduled = 0;
  let totalCallsDuringShift = 0;
  let totalAnsweredCalls = 0;
  let totalMissedCalls = 0;
  let totalCallDuration = 0;

  const shiftDetails: ShiftDetail[] = [];

  for (const shift of shifts) {
    const hoursScheduled = calculateShiftHours(shift.startTime, shift.endTime);
    totalHoursScheduled += hoursScheduled;

    // Get calls during this shift
    const calls = await queryCalls({
      dateFrom: shift.startTimestamp,
      dateTo: shift.endTimestamp,
      operatorName,
      limit: 10000,
    });

    const answeredCalls = calls.filter(c => c.callDuration && c.callDuration > 0);
    const missedCalls = calls.filter(c => c.callEnd && (!c.callDuration || c.callDuration === 0));

    totalCallsDuringShift += calls.length;
    totalAnsweredCalls += answeredCalls.length;
    totalMissedCalls += missedCalls.length;
    totalCallDuration += answeredCalls.reduce((sum, c) => sum + (c.callDuration || 0), 0);

    shiftDetails.push({
      shiftId: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      hoursScheduled,
      callsDuringShift: calls.length,
      answeredCalls: answeredCalls.length,
      missedCalls: missedCalls.length,
    });
  }

  return {
    userId,
    operatorName,
    periodStart: new Date(`${dateFrom}T00:00:00+05:00`).getTime(),
    periodEnd: new Date(`${dateTo}T23:59:59+05:00`).getTime(),
    totalShifts: shifts.length,
    totalHoursScheduled,
    callsDuringShift: totalCallsDuringShift,
    answeredCalls: totalAnsweredCalls,
    missedCalls: totalMissedCalls,
    avgCallDuration: totalAnsweredCalls > 0 ? Math.round(totalCallDuration / totalAnsweredCalls) : 0,
    answerRate: totalCallsDuringShift > 0 ? Math.round((totalAnsweredCalls / totalCallsDuringShift) * 100) : 0,
    shifts: shiftDetails,
  };
}
