// Call Log types
export interface CallLog {
  id: string;
  callId: string;
  phoneNumber: string;
  internalNumber?: string;
  callType: 'incoming' | 'outgoing';
  callerType?: 'driver' | 'client';

  // Operator fields
  region?: string;
  topic?: string;
  operatorName?: string;
  notes?: string;

  // Driver info (Redis dan string sifatida ham kelishi mumkin)
  isDriver: boolean | string;
  driverId?: string;
  driverName?: string;
  driverCar?: string;
  driverRating?: string;
  driverStatus?: string;
  driverExtraInfo?: Record<string, unknown>;
  managerNumber?: string;

  // Timestamps (Unix ms)
  callStart: number;
  callEnd?: number;
  callDuration?: number;
  createdAt: number;
  updatedAt: number;
  syncedToSheets: boolean;
}

export interface CallLogCreate {
  callId: string;
  phoneNumber: string;
  internalNumber?: string;
  callType: 'incoming' | 'outgoing';
}

export interface CallLogUpdate {
  callerType?: 'driver' | 'client';
  region?: string;
  topic?: string;
  operatorName?: string;
  notes?: string;
}

// User types
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName?: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: number;
  lastLogin?: number;
}

export interface UserCreate {
  username: string;
  password: string;
  fullName?: string;
  isAdmin?: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  fullName?: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: number;
  lastLogin?: number;
}

// Session types
export interface Session {
  userId: string;
  username: string;
  fullName?: string;
  isAdmin: boolean;
  createdAt: number;
  expiresAt: number;
}

// Driver/Client lookup types
export interface DriverInfo {
  isDriver: boolean;
  driverId?: string;
  driverName?: string;
  driverCar?: string;
  driverRating?: string;
  driverStatus?: string;
  managerNumber?: string;
  extraInfo?: Record<string, unknown>;
}

export interface ClientInfo {
  isClient: boolean;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  totalOrders?: number;
  completedOrders?: number;
}

export interface LookupResult {
  driverInfo?: DriverInfo;
  clientInfo?: ClientInfo;
}

// Real-time event types
export interface RealtimeEvent {
  type: 'incoming_call' | 'call_ended' | 'call_updated' | 'connected';
  data?: CallLog | { callId: string } | null;
  timestamp?: number;
}

// Filter types
export interface CallFilters {
  dateFrom?: number;
  dateTo?: number;
  region?: string;
  driverId?: string;
  callType?: 'incoming' | 'outgoing';
  callerType?: 'driver' | 'client';
  operatorName?: string;
  phoneNumber?: string;
  limit?: number;
  offset?: number;
}

// Report stats
export interface ReportStats {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  driverCalls: number;
  clientCalls: number;
  avgDuration: number;
  byRegion: Record<string, number>;
  byOperator: Record<string, number>;
}

// Regions list
export const REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon',
  'Buxoro',
  'Fargona',
  'Jizzax',
  'Xorazm',
  'Namangan',
  'Navoiy',
  'Qashqadaryo',
  'Qoraqalpogiston',
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
] as const;

// Topics list (default/fallback)
export const DEFAULT_TOPICS = [
  'Buyurtma',
  'Shikoyat',
  'Maslahat',
  'Texnik yordam',
  'Boshqa',
  'Noaniq',
] as const;

// For backward compatibility
export const TOPICS = DEFAULT_TOPICS;

// Topic type for dynamic topics
export interface Topic {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
  createdAt: number;
}

// Contact type (saved caller names)
export interface Contact {
  phoneNumber: string;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

// Operator statistics
export interface OperatorStats {
  operatorName: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  answerRate: number;
}

// Missed call type
export interface MissedCall {
  id: string;
  callId: string;
  phoneNumber: string;
  callStart: number;
  internalNumber?: string;
  contactName?: string;
  isDriver: boolean;
  driverName?: string;
  callbackAt?: number;
  callbackBy?: string;
}
