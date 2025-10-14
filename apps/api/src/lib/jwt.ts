import jwt from 'jsonwebtoken';
const JWT = process.env.JWT_SECRET || 'dev-secret';
export function signDriverToken(driverId: string, tenantId?: string){
  return (jwt as any).sign({ sub: driverId, driverId, tenantId, scope: 'driver' }, JWT, { expiresIn: '7d' });
}
export function verifyToken(token: string){
  return (jwt as any).verify(token, JWT) as any;
}