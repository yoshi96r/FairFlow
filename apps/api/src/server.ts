import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import http from 'http';
import { WebSocketServer } from 'ws';
import { prisma } from './lib/prisma';
import {
  AuthToken,
  DriverToken,
  signDriverToken,
  signUserToken,
  verifyToken,
  UserToken,
} from './lib/jwt';
import {
  ActorType,
  Prisma,
  RouteStatus,
  Shipment,
  ShipmentStatus,
  StatusEvent,
} from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws/live' });

type LiveDriver = {
  id: string;
  name: string;
  routeId?: string | null;
  lat: number;
  lng: number;
  heading?: number;
  speedKph?: number;
  updatedAt: number;
};

const liveDrivers = new Map<string, LiveDriver>();

function broadcastDrivers() {
  const payload = JSON.stringify({ type: 'drivers', drivers: Array.from(liveDrivers.values()) });
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) client.send(payload);
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'drivers', drivers: Array.from(liveDrivers.values()) }));
});

declare global {
  namespace Express {
    interface Request {
      driver?: DriverToken;
      user?: UserToken;
    }
  }
}

function parseAuthHeader(header?: string | null): AuthToken | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return verifyToken(header.slice(7));
  } catch (err) {
    return null;
  }
}

function requireDriver(req: Request, res: Response, next: NextFunction) {
  const token = parseAuthHeader(req.headers.authorization);
  if (!token || token.scope !== 'driver') {
    return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  }
  req.driver = token;
  next();
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = parseAuthHeader(req.headers.authorization);
  if (!token || token.scope !== 'user') {
    return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  }
  req.user = token;
  next();
}

function normalizeShipment(shipment: Shipment & {
  customer: { name: string } | null;
  routeStops: { route: { id: string; name: string; status: RouteStatus } }[];
  statusEvents: StatusEvent[];
}) {
  const assignedStop = shipment.routeStops[0];
  const latestEvent = shipment.statusEvents[0];
  return {
    id: shipment.id,
    trackingCode: shipment.trackingCode,
    referenceNo: shipment.referenceNo,
    status: shipment.status,
    serviceLevel: shipment.serviceLevel,
    addressLine1: shipment.addressLine1,
    city: shipment.city,
    state: shipment.state,
    postalCode: shipment.postalCode,
    deliverBy: shipment.deliverBy?.toISOString() ?? null,
    customerName: shipment.customer?.name ?? null,
    assignedRoute: assignedStop
      ? { id: assignedStop.route.id, name: assignedStop.route.name, status: assignedStop.route.status }
      : null,
    latestEvent: latestEvent
      ? { status: latestEvent.status, at: latestEvent.at.toISOString(), actorType: latestEvent.actorType }
      : null,
    createdAt: shipment.createdAt.toISOString(),
  };
}

function syncLiveDriverRoute(driverId: string | null | undefined, routeId: string | null) {
  if (!driverId) return;
  const current = liveDrivers.get(driverId);
  if (current) {
    liveDrivers.set(driverId, { ...current, routeId });
    broadcastDrivers();
  }
}

function validateShipmentStatus(status: any): status is ShipmentStatus {
  return (
    status === 'CREATED' ||
    status === 'ASSIGNED' ||
    status === 'IN_TRANSIT' ||
    status === 'DELIVERED' ||
    status === 'EXCEPTION' ||
    status === 'RETURNED' ||
    status === 'CANCELED'
  );
}

// Demo driver login -> returns JWT
app.post('/api/mobile/login', async (req, res) => {
  const { phone } = req.body as { phone?: string };
  let driver = await prisma.driver.findFirst({ where: { phone } });
  if (!driver) {
    const tenant = await prisma.tenant.upsert({
      where: { id: 'demo-tenant' },
      update: {},
      create: { id: 'demo-tenant', name: 'Demo Tenant' },
    });
    driver = await prisma.driver.create({
      data: { name: `Driver ${phone ?? 'demo'}`, phone, tenantId: tenant.id },
    });
  }
  const token = signDriverToken(driver.id, driver.tenantId);
  res.json({ ok: true, token, driverId: driver.id });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'MISSING_CREDENTIALS' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.hashedPassword !== password) {
    return res.status(401).json({ ok: false, error: 'INVALID_LOGIN' });
  }
  const token = signUserToken(user.id, user.tenantId, user.role);
  res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

// Secure GPS ingest
app.post('/api/mobile/position', requireDriver, async (req: Request, res: Response) => {
  const { driverId } = req.driver!;
  const { lat, lng, heading, speedKph, routeId } = req.body as {
    lat: number;
    lng: number;
    heading?: number;
    speedKph?: number;
    routeId?: string | null;
  };
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
  }
  if (speedKph && speedKph > 200) {
    return res.status(422).json({ ok: false, error: 'SPEED_OOB' });
  }

  await prisma.driver
    .update({ where: { id: driverId }, data: { lastKnownLat: lat, lastKnownLng: lng, lastSeenAt: new Date() } })
    .catch(() => undefined);
  await prisma.driverPosition
    .create({ data: { driverId, lat, lng, speedKph, heading } })
    .catch(() => undefined);

  const existing = liveDrivers.get(driverId);
  const name = existing?.name || `Driver ${driverId.slice(-4)}`;
  liveDrivers.set(driverId, {
    id: driverId,
    name,
    routeId: routeId ?? existing?.routeId ?? null,
    lat,
    lng,
    heading,
    speedKph,
    updatedAt: Date.now(),
  });
  broadcastDrivers();
  res.json({ ok: true });
});

// Cleanup offline drivers every 30s (2 min timeout)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, driver] of liveDrivers) {
    if (now - driver.updatedAt > 120_000) {
      liveDrivers.delete(id);
      changed = true;
    }
  }
  if (changed) broadcastDrivers();
}, 30_000);

app.get('/api/shipments', requireUser, async (req, res) => {
  const { tenantId } = req.user!;
  const { status, q } = req.query as { status?: string; q?: string };
  const where: Prisma.ShipmentWhereInput = { tenantId };
  if (status && validateShipmentStatus(status)) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { trackingCode: { contains: q, mode: 'insensitive' } },
      { referenceNo: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { city: { contains: q, mode: 'insensitive' } },
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: true,
      routeStops: { include: { route: true }, orderBy: { sequence: 'asc' }, take: 1 },
      statusEvents: { orderBy: { at: 'desc' }, take: 1 },
    },
  });

  res.json({ ok: true, shipments: shipments.map(normalizeShipment) });
});

app.post('/api/shipments', requireUser, async (req, res) => {
  const { tenantId, userId } = req.user!;
  const payload = req.body as Partial<Shipment> & { customerName?: string; contactEmail?: string; contactPhone?: string };
  if (!payload.addressLine1 || !payload.city || !payload.state || !payload.postalCode) {
    return res.status(400).json({ ok: false, error: 'MISSING_ADDRESS' });
  }

  const trackingCode = payload.trackingCode || `FF${Math.floor(Math.random() * 900000 + 100000)}`;

  const customer = payload.customerName
    ? await prisma.customer.upsert({
        where: { tenantId_name: { tenantId, name: payload.customerName } },
        update: {
          contactEmail: payload.contactEmail ?? undefined,
          contactPhone: payload.contactPhone ?? undefined,
        },
        create: {
          tenantId,
          name: payload.customerName,
          contactEmail: payload.contactEmail ?? null,
          contactPhone: payload.contactPhone ?? null,
          addressLine1: payload.addressLine1,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          country: payload.country ?? 'US',
        },
      })
    : null;

  const shipment = await prisma.shipment.create({
    data: {
      tenantId,
      trackingCode,
      referenceNo: payload.referenceNo,
      weightGrams: payload.weightGrams ?? null,
      volumeCubicCm: payload.volumeCubicCm ?? null,
      notes: payload.notes ?? null,
      serviceLevel: payload.serviceLevel ?? 'STANDARD',
      pickupAt: payload.pickupAt ? new Date(payload.pickupAt) : null,
      deliverBy: payload.deliverBy ? new Date(payload.deliverBy) : null,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 ?? null,
      city: payload.city,
      state: payload.state,
      postalCode: payload.postalCode,
      country: payload.country ?? 'US',
      geoLat: payload.geoLat ?? null,
      geoLng: payload.geoLng ?? null,
      customerId: customer?.id ?? payload.customerId ?? null,
    },
    include: {
      customer: true,
      routeStops: { include: { route: true }, take: 1 },
      statusEvents: true,
    },
  });

  await prisma.statusEvent.create({
    data: {
      shipmentId: shipment.id,
      status: 'CREATED',
      actorType: 'USER',
      actorId: userId,
      data: payload.notes ? { notes: payload.notes } : undefined,
    },
  });

  const fresh = await prisma.shipment.findUnique({
    where: { id: shipment.id },
    include: {
      customer: true,
      routeStops: { include: { route: true }, orderBy: { sequence: 'asc' }, take: 1 },
      statusEvents: { orderBy: { at: 'desc' }, take: 1 },
    },
  });

  res.status(201).json({ ok: true, shipment: fresh ? normalizeShipment(fresh) : null });
});

app.post('/api/shipments/:id/status', requireUser, async (req, res) => {
  const { tenantId, userId, role } = req.user!;
  const { id } = req.params;
  const { status, notes } = req.body as { status?: ShipmentStatus; notes?: string };
  if (!status || !validateShipmentStatus(status)) {
    return res.status(400).json({ ok: false, error: 'INVALID_STATUS' });
  }
  const shipment = await prisma.shipment.findFirst({ where: { id, tenantId } });
  if (!shipment) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  }

  await prisma.shipment.update({ where: { id: shipment.id }, data: { status } });
  await prisma.statusEvent.create({
    data: {
      shipmentId: shipment.id,
      status,
      actorType: role === 'DRIVER' ? 'DRIVER' : 'USER',
      actorId: userId,
      data: notes ? { notes } : undefined,
    },
  });

  const fresh = await prisma.shipment.findUnique({
    where: { id: shipment.id },
    include: {
      customer: true,
      routeStops: { include: { route: true }, take: 1 },
      statusEvents: { orderBy: { at: 'desc' }, take: 1 },
    },
  });
  res.json({ ok: true, shipment: fresh ? normalizeShipment(fresh) : null });
});

app.get('/api/drivers', requireUser, async (req, res) => {
  const { tenantId } = req.user!;
  const drivers = await prisma.driver.findMany({
    where: { tenantId },
    include: {
      routes: { orderBy: { serviceDate: 'desc' }, take: 5 },
    },
    orderBy: { name: 'asc' },
  });

  const now = Date.now();
  const response = drivers.map((driver) => {
    const activeRoute = driver.routes.find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELED');
    const live = liveDrivers.get(driver.id);
    const lastSeenAt = driver.lastSeenAt?.toISOString() ?? null;
    const isActive = driver.lastSeenAt ? now - driver.lastSeenAt.getTime() < 15 * 60 * 1000 : false;
    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehiclePlate: driver.vehiclePlate,
      lastKnownLat: driver.lastKnownLat,
      lastKnownLng: driver.lastKnownLng,
      lastSeenAt,
      isOnline: !!live || isActive,
      activeRoute: activeRoute ? { id: activeRoute.id, name: activeRoute.name, status: activeRoute.status } : null,
    };
  });
  res.json({ ok: true, drivers: response });
});

function mapRoute(route: Awaited<ReturnType<typeof fetchRouteById>>) {
  if (!route) return null;
  return {
    id: route.id,
    name: route.name,
    serviceDate: route.serviceDate.toISOString(),
    status: route.status,
    driver: route.driver ? { id: route.driver.id, name: route.driver.name } : null,
    stopCount: route.stops.length,
    stops: route.stops.map((stop) => ({
      id: stop.id,
      sequence: stop.sequence,
      eta: stop.eta?.toISOString() ?? null,
      arrivedAt: stop.arrivedAt?.toISOString() ?? null,
      departedAt: stop.departedAt?.toISOString() ?? null,
      shipment: {
        id: stop.shipment.id,
        trackingCode: stop.shipment.trackingCode,
        status: stop.shipment.status,
        addressLine1: stop.shipment.addressLine1,
        city: stop.shipment.city,
        state: stop.shipment.state,
      },
    })),
  };
}

async function fetchRouteById(id: string) {
  return prisma.route.findUnique({
    where: { id },
    include: {
      driver: true,
      stops: {
        include: { shipment: true },
        orderBy: { sequence: 'asc' },
      },
    },
  });
}

app.get('/api/routes', requireUser, async (req, res) => {
  const { tenantId } = req.user!;
  const routes = await prisma.route.findMany({
    where: { tenantId },
    orderBy: { serviceDate: 'desc' },
    take: 40,
    include: {
      driver: true,
      stops: { include: { shipment: true }, orderBy: { sequence: 'asc' } },
    },
  });
  res.json({ ok: true, routes: routes.map((r) => mapRoute(r)) });
});

app.post('/api/routes', requireUser, async (req, res) => {
  const { tenantId } = req.user!;
  const payload = req.body as {
    name: string;
    serviceDate: string;
    driverId?: string | null;
    stops: { shipmentId: string; eta?: string | null }[];
  };

  if (!payload?.name || !payload?.serviceDate || !Array.isArray(payload.stops) || payload.stops.length === 0) {
    return res.status(400).json({ ok: false, error: 'INVALID_ROUTE' });
  }

  const shipmentIds = [...new Set(payload.stops.map((s) => s.shipmentId))];
  const shipments = await prisma.shipment.findMany({ where: { id: { in: shipmentIds }, tenantId } });
  if (shipments.length !== shipmentIds.length) {
    return res.status(400).json({ ok: false, error: 'SHIPMENT_MISMATCH' });
  }

  const route = await prisma.route.create({
    data: {
      tenantId,
      name: payload.name,
      serviceDate: new Date(payload.serviceDate),
      status: 'PUBLISHED',
      driverId: payload.driverId ?? null,
      stops: {
        create: payload.stops.map((stop, index) => ({
          shipmentId: stop.shipmentId,
          sequence: index + 1,
          eta: stop.eta ? new Date(stop.eta) : null,
        })),
      },
    },
  });

  await prisma.shipment.updateMany({
    where: { id: { in: shipmentIds } },
    data: { status: 'ASSIGNED' },
  });

  await prisma.statusEvent.createMany({
    data: shipmentIds.map((shipmentId) => ({
      shipmentId,
      status: 'ASSIGNED',
      actorType: 'USER' as ActorType,
      actorId: req.user!.userId,
    })),
    skipDuplicates: true,
  });

  if (payload.driverId) {
    syncLiveDriverRoute(payload.driverId, route.id);
  }

  const fresh = await fetchRouteById(route.id);
  res.status(201).json({ ok: true, route: mapRoute(fresh) });
});

app.patch('/api/routes/:id', requireUser, async (req, res) => {
  const { tenantId } = req.user!;
  const { id } = req.params;
  const { status, driverId, name, serviceDate } = req.body as {
    status?: RouteStatus;
    driverId?: string | null;
    name?: string;
    serviceDate?: string;
  };

  const route = await prisma.route.findFirst({
    where: { id, tenantId },
    include: { stops: true },
  });
  if (!route) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  }

  const data: Prisma.RouteUpdateInput = {};
  if (status) data.status = status;
  if (name) data.name = name;
  if (serviceDate) data.serviceDate = new Date(serviceDate);
  if (driverId !== undefined) {
    data.driver = driverId ? { connect: { id: driverId } } : { disconnect: true };
  }

  const updated = await prisma.route.update({ where: { id: route.id }, data });

  if (driverId !== undefined) {
    syncLiveDriverRoute(route.driverId, null);
    syncLiveDriverRoute(driverId, updated.id);
  }

  if (status === 'COMPLETED') {
    await Promise.all(
      route.stops.map((stop) =>
        prisma.shipment.update({ where: { id: stop.shipmentId }, data: { status: 'DELIVERED' } })
      )
    );
    await prisma.statusEvent.createMany({
      data: route.stops.map((stop) => ({
        shipmentId: stop.shipmentId,
        status: 'DELIVERED',
        actorType: 'SYSTEM' as ActorType,
      })),
    });
  }

  const fresh = await fetchRouteById(updated.id);
  res.json({ ok: true, route: mapRoute(fresh) });
});

app.get('/api/dashboard/overview', requireUser, async (req, res) => {
  const { tenantId } = req.user!;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [createdToday, inTransit, delivered, exceptions, routesToday, driversActive] = await Promise.all([
    prisma.shipment.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
    prisma.shipment.count({ where: { tenantId, status: { in: ['ASSIGNED', 'IN_TRANSIT'] } } }),
    prisma.shipment.count({ where: { tenantId, status: 'DELIVERED' } }),
    prisma.shipment.count({ where: { tenantId, status: 'EXCEPTION' } }),
    prisma.route.count({
      where: {
        tenantId,
        serviceDate: {
          gte: startOfDay,
          lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.driver.count({ where: { tenantId, lastSeenAt: { gte: fifteenMinutesAgo } } }),
  ]);

  res.json({
    ok: true,
    overview: {
      shipmentsCreatedToday: createdToday,
      shipmentsInMotion: inTransit,
      shipmentsDelivered: delivered,
      exceptionsOpen: exceptions,
      routesToday,
      driversActive,
    },
  });
});

// Health check endpoint
app.get('/api/healthz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: true });
  } catch (e) {
    res.status(500).json({ status: 'error', db: false });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`FairFlow API running on :${PORT}`));
