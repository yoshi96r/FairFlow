import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import http from 'http';
import { WebSocketServer } from 'ws';
import { prisma } from './lib/prisma';
import { signDriverToken, verifyToken } from './lib/jwt';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws/live' });

type LiveDriver = { id: string; name: string; routeId?: string|null; lat: number; lng: number; heading?: number; speedKph?: number; updatedAt: number };
const liveDrivers = new Map<string, LiveDriver>();

function broadcastDrivers(){
  const payload = JSON.stringify({ type: 'drivers', drivers: Array.from(liveDrivers.values()) });
  wss.clients.forEach((client: any) => { if (client.readyState === 1) client.send(payload); });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'drivers', drivers: Array.from(liveDrivers.values()) }));
});

// Demo driver login -> returns JWT
app.post('/api/mobile/login', async (req, res) => {
  const { phone } = req.body as { phone?: string };
  let driver = await prisma.driver.findFirst({ where: { phone } });
  if (!driver) {
    const tenant = await prisma.tenant.upsert({ where: { id: 'demo-tenant' }, update: {}, create: { id: 'demo-tenant', name: 'Demo Tenant' } });
    driver = await prisma.driver.create({ data: { name: `Driver ${phone ?? 'demo'}`, phone, tenantId: tenant.id } });
  }
  const token = signDriverToken(driver.id, driver.tenantId);
  res.json({ ok: true, token, driverId: driver.id });
});

// Auth middleware for driver endpoints
function requireDriver(req: any, res: any, next: any){
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ ok:false, error:'NO_TOKEN' });
  try { req.driver = verifyToken(auth.slice(7)); next(); } catch { return res.status(401).json({ ok:false, error:'BAD_TOKEN' }); }
}

// Secure GPS ingest
app.post('/api/mobile/position', requireDriver, async (req: any, res) => {
  const { driverId } = req.driver;
  const { lat, lng, heading, speedKph, routeId } = req.body as { lat:number; lng:number; heading?:number; speedKph?:number; routeId?:string|null };
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ ok:false, error:'INVALID_PAYLOAD' });
  if (speedKph && speedKph > 200) return res.status(422).json({ ok:false, error:'SPEED_OOB' });

  await prisma.driver.update({ where: { id: driverId }, data: { lastKnownLat: lat, lastKnownLng: lng, lastSeenAt: new Date() } }).catch(()=>{});
  await prisma.driverPosition.create({ data: { driverId, lat, lng, speedKph, heading } }).catch(()=>{});

  const name = liveDrivers.get(driverId)?.name || `Driver ${driverId.slice(-4)}`;
  liveDrivers.set(driverId, { id: driverId, name, routeId: routeId ?? liveDrivers.get(driverId)?.routeId ?? null, lat, lng, heading, speedKph, updatedAt: Date.now() });
  broadcastDrivers();
  res.json({ ok:true });
});

// Cleanup offline drivers every 30s (2 min timeout)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, d] of liveDrivers) {
    if (now - d.updatedAt > 120_000) { liveDrivers.delete(id); changed = true; }
  }
  if (changed) broadcastDrivers();
}, 30_000);



// Health check endpoint
app.get('/api/healthz', async (_req, res) => {
  try {
    // DB ping
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: true });
  } catch (e) {
    res.status(500).json({ status: 'error', db: false });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`FairFlow API running on :${PORT}`));