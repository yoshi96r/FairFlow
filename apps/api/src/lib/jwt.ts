import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type BaseToken = {
  sub: string;
  tenantId?: string;
  scope: 'driver' | 'user';
  exp?: number;
};

export type DriverToken = BaseToken & {
  scope: 'driver';
  driverId: string;
};

export type UserToken = BaseToken & {
  scope: 'user';
  userId: string;
  role: string;
};

export type AuthToken = DriverToken | UserToken;

export function signDriverToken(driverId: string, tenantId?: string) {
  return (jwt as any).sign(
    { sub: driverId, driverId, tenantId, scope: 'driver' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function signUserToken(userId: string, tenantId: string, role: string) {
  return (jwt as any).sign(
    { sub: userId, userId, tenantId, role, scope: 'user' },
    JWT_SECRET,
    { expiresIn: '2d' }
  );
}

export function verifyToken(token: string): AuthToken {
  return (jwt as any).verify(token, JWT_SECRET) as AuthToken;
}
