export type UserRole = 'developer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  githubUsername?: string;
  balance: number;
  createdAt: any;
  lastActive?: any;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: any;
}

export interface Service {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  type: 'web_service' | 'postgres' | 'redis' | 'static_site';
  status: 'active' | 'deploying' | 'failed' | 'offline';
  repository?: string;
  branch?: string;
  port?: number;
  domain?: string;
  endpoint?: string;
  createdAt: any;
}

export interface Deployment {
  id: string;
  serviceId: string;
  projectId: string;
  ownerId: string;
  commitMsg?: string;
  commitHash?: string;
  status: 'active' | 'deploying' | 'failed';
  logs: string[];
  createdAt: any;
}

export interface EnvVar {
  id: string;
  projectId: string;
  ownerId: string;
  key: string;
  value: string;
  isSecret?: boolean;
  createdAt: any;
}

export interface Metric {
  id: string;
  serviceId: string;
  ownerId: string;
  timestamps: number[];
  cpu: number[];
  ram: number[];
  bandwidth: number[];
  updatedAt: any;
}

export interface CommunityMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  createdAt: any;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'charge';
  description?: string;
  createdAt: any;
}
