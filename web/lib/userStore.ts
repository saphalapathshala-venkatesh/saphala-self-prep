export interface User {
  id: string;
  email: string;
  mobile: string;
  passwordHash: string;
  createdAt: Date;
}

const users = new Map<string, User>();
const emailIndex = new Map<string, string>();
const mobileIndex = new Map<string, string>();

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

export function createUser(email: string, mobile: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.replace(/\D/g, "");

  if (emailIndex.has(normalizedEmail)) {
    return null;
  }
  if (mobileIndex.has(normalizedMobile)) {
    return null;
  }

  const id = generateId();
  const user: User = {
    id,
    email: normalizedEmail,
    mobile: normalizedMobile,
    passwordHash: hashPassword(password),
    createdAt: new Date(),
  };

  users.set(id, user);
  emailIndex.set(normalizedEmail, id);
  mobileIndex.set(normalizedMobile, id);

  return user;
}

export function findUserByEmail(email: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  const userId = emailIndex.get(normalizedEmail);
  return userId ? users.get(userId) || null : null;
}

export function findUserByMobile(mobile: string): User | null {
  const normalizedMobile = mobile.replace(/\D/g, "");
  const userId = mobileIndex.get(normalizedMobile);
  return userId ? users.get(userId) || null : null;
}

export function findUserById(id: string): User | null {
  return users.get(id) || null;
}

export function verifyPassword(user: User, password: string): boolean {
  return user.passwordHash === hashPassword(password);
}

export function isEmailTaken(email: string): boolean {
  return emailIndex.has(email.trim().toLowerCase());
}

export function isMobileTaken(mobile: string): boolean {
  return mobileIndex.has(mobile.replace(/\D/g, ""));
}
