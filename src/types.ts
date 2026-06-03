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
  githubRepo?: string;
  webhookSecret?: string;
  createdAt: any;
}

export interface Deployment {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  type: 'web_service' | 'postgres' | 'redis' | 'static_site';
  status: 'active' | 'deploying' | 'failed' | 'offline';
  repository?: string;
  branch?: string;
  commitHash?: string;
  commitMsg?: string;
  port?: number;
  domain?: string;
  previewUrl?: string;
  logs?: string[];
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

export interface Domain {
  id: string;
  projectId: string;
  ownerId: string;
  domain: string;
  targetDeploymentId: string;
  type: 'preview' | 'production' | 'custom';
  status: 'pending' | 'verified' | 'active';
  createdAt: any;
}

export interface Metric {
  id: string;
  deploymentId: string;
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
