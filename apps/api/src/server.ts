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

const DEFAULT_TENANT_ID = 'demo-tenant';

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
    const tenant = await prisma.tenant.upsert({ where: { id: DEFAULT_TENANT_ID }, update: {}, create: { id: DEFAULT_TENANT_ID, name: 'Demo Tenant' } });
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

app.get('/api/shipments', async (req, res) => {
  const tenantId = (req.query.tenantId as string) || DEFAULT_TENANT_ID;
  const status = (req.query.status as string) || undefined;
  const q = (req.query.q as string)?.trim().toLowerCase();
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '25', 10) || 25, 1), 100);

  const where: any = { tenantId };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { trackingCode: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { state: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } }
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true } },
      routeStops: { include: { route: { select: { id: true, name: true, serviceDate: true } } }, orderBy: { sequence: 'asc' } }
    }
  });
  res.json({ ok: true, shipments });
});

app.post('/api/shipments', async (req, res) => {
  const tenantId = (req.body?.tenantId as string) || DEFAULT_TENANT_ID;
  const {
    customerId,
    customerName,
    contactEmail,
    contactPhone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    serviceLevel,
    notes,
    referenceNo,
    trackingCode
  } = req.body as any;

  if (!addressLine1 || !city || !state || !postalCode) {
    return res.status(400).json({ ok: false, error: 'MISSING_ADDRESS' });
  }

  let resolvedCustomerId = customerId;
  if (!resolvedCustomerId && customerName) {
    const customer = await prisma.customer.upsert({
      where: { name_tenantId: { name: customerName, tenantId } },
      update: { contactEmail, contactPhone },
      create: {
        name: customerName,
        tenantId,
        contactEmail,
        contactPhone,
        addressLine1: addressLine1,
        city,
        state,
        postalCode,
        country: 'US'
      }
    }).catch(() => null);
    resolvedCustomerId = customer?.id || undefined;
  }

  const normalizedService = typeof serviceLevel === 'string' ? serviceLevel.toUpperCase() : 'STANDARD';
  const code = trackingCode || `FF${Math.floor(Date.now() / 1000)}`;

  try {
    const shipment = await prisma.shipment.create({
      data: {
        tenantId,
        trackingCode: code,
        referenceNo,
        serviceLevel: normalizedService,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        status: 'CREATED',
        notes,
        customerId: resolvedCustomerId,
        statusEvents: { create: [{ status: 'CREATED', actorType: 'USER', data: { via: 'dashboard' } }] }
      },
      include: { customer: { select: { id: true, name: true } } }
    });
    res.status(201).json({ ok: true, shipment });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'CREATE_FAILED' });
  }
});

function getDateRangeForWindow(param?: string){
  if (!param) return undefined;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  if (param === 'today') {
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    return { gte: base, lte: end };
  }
  return undefined;
}

app.get('/api/routes', async (req, res) => {
  const tenantId = (req.query.tenantId as string) || DEFAULT_TENANT_ID;
  const serviceDateFilter = getDateRangeForWindow(req.query.window as string);
  const where: any = { tenantId };
  if (serviceDateFilter) where.serviceDate = serviceDateFilter;
  const routes = await prisma.route.findMany({
    where,
    orderBy: { serviceDate: 'asc' },
    include: {
      driver: { select: { id: true, name: true } },
      stops: {
        include: { shipment: { select: { id: true, trackingCode: true, city: true, state: true, status: true } } },
        orderBy: { sequence: 'asc' }
      }
    }
  });
  res.json({ ok: true, routes });
});

app.get('/api/dashboard/overview', async (_req, res) => {
  const tenantId = DEFAULT_TENANT_ID;
  try {
    const [shipmentCounts, customerCount, activeRoutes, recentShipments] = await Promise.all([
      prisma.shipment.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { tenantId }
      }),
      prisma.customer.count({ where: { tenantId } }),
      prisma.route.count({ where: { tenantId, status: { notIn: ['CANCELED'] } } }),
      prisma.shipment.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, trackingCode: true, status: true, city: true, state: true, createdAt: true }
      })
    ]);

    const shipmentsByStatus: Record<string, number> = {};
    shipmentCounts.forEach((row: any) => { shipmentsByStatus[row.status] = row._count._all; });

    res.json({
      ok: true,
      stats: {
        shipmentsByStatus,
        totals: {
          customers: customerCount,
          activeRoutes,
          activeDrivers: liveDrivers.size,
          pendingDeliveries: (shipmentsByStatus['IN_TRANSIT'] || 0) + (shipmentsByStatus['ASSIGNED'] || 0) + (shipmentsByStatus['CREATED'] || 0)
        }
      },
      recentShipments
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'OVERVIEW_FAILED' });
  }
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`FairFlow API running on :${PORT}`));
