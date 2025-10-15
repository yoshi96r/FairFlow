import { PrismaClient, ShipmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const now = new Date();

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function seedShipments(tenantId: string, customerId: string) {
  const seeds: Array<{
    trackingCode: string;
    referenceNo: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    status: ShipmentStatus;
    serviceLevel?: 'STANDARD' | 'EXPEDITED' | 'OVERNIGHT';
    notes?: string;
    deliverByOffsetHours?: number;
    timeline: ShipmentStatus[];
  }> = [
    {
      trackingCode: 'FF1001',
      referenceNo: 'AC-001',
      addressLine1: '125 Market St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      status: 'CREATED',
      notes: 'Fragile - handle with care',
      deliverByOffsetHours: 24,
      timeline: ['CREATED'],
    },
    {
      trackingCode: 'FF1002',
      referenceNo: 'AC-002',
      addressLine1: '301 S Wacker Dr',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60606',
      status: 'ASSIGNED',
      serviceLevel: 'STANDARD',
      timeline: ['CREATED', 'ASSIGNED'],
    },
    {
      trackingCode: 'FF1003',
      referenceNo: 'AC-003',
      addressLine1: '233 S Wacker Dr',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60606',
      status: 'IN_TRANSIT',
      serviceLevel: 'EXPEDITED',
      timeline: ['CREATED', 'ASSIGNED', 'IN_TRANSIT'],
    },
    {
      trackingCode: 'FF1004',
      referenceNo: 'AC-004',
      addressLine1: '600 W Chicago Ave',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60654',
      status: 'DELIVERED',
      timeline: ['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'],
    },
    {
      trackingCode: 'FF1005',
      referenceNo: 'AC-005',
      addressLine1: '1 E Erie St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60611',
      status: 'EXCEPTION',
      notes: 'Customer requested reschedule',
      timeline: ['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'EXCEPTION'],
    },
    {
      trackingCode: 'FF1006',
      referenceNo: 'AC-006',
      addressLine1: '350 N Orleans St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60654',
      status: 'CREATED',
      timeline: ['CREATED'],
    },
  ];

  const results = [] as string[];
  for (const seed of seeds) {
    const deliverBy = seed.deliverByOffsetHours ? addHours(now, seed.deliverByOffsetHours) : null;
    const shipment = await prisma.shipment.upsert({
      where: { trackingCode: seed.trackingCode },
      update: {
        tenantId,
        referenceNo: seed.referenceNo,
        addressLine1: seed.addressLine1,
        city: seed.city,
        state: seed.state,
        postalCode: seed.postalCode,
        status: seed.status,
        serviceLevel: seed.serviceLevel ?? 'STANDARD',
        notes: seed.notes ?? null,
        deliverBy,
        customerId,
      },
      create: {
        tenantId,
        trackingCode: seed.trackingCode,
        referenceNo: seed.referenceNo,
        addressLine1: seed.addressLine1,
        city: seed.city,
        state: seed.state,
        postalCode: seed.postalCode,
        status: seed.status,
        serviceLevel: seed.serviceLevel ?? 'STANDARD',
        notes: seed.notes ?? null,
        deliverBy,
        customerId,
      },
    });

    await prisma.statusEvent.deleteMany({ where: { shipmentId: shipment.id } });
    for (const [index, status] of seed.timeline.entries()) {
      await prisma.statusEvent.create({
        data: {
          shipmentId: shipment.id,
          status,
          actorType: 'SYSTEM',
          at: addHours(now, -seed.timeline.length + index + 1),
          data: index === seed.timeline.length - 1 && seed.notes ? { notes: seed.notes } : undefined,
        },
      });
    }

    results.push(shipment.id);
  }
  return results;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: { id: 'demo-tenant', name: 'Demo Tenant' },
  });

  await prisma.user.upsert({
    where: { email: 'dispatcher@fairflow.local' },
    update: { hashedPassword: 'dispatch' },
    create: {
      email: 'dispatcher@fairflow.local',
      hashedPassword: 'dispatch',
      tenantId: tenant.id,
      role: 'DISPATCHER',
    },
  });

  const driverOne = await prisma.driver.upsert({
    where: { id: 'drv_demo_1' },
    update: {
      tenantId: tenant.id,
      name: 'Driver Demo 1',
      phone: '5550001',
      vehiclePlate: 'FF-101',
      lastKnownLat: 41.883,
      lastKnownLng: -87.635,
      lastSeenAt: addHours(now, -1),
    },
    create: {
      id: 'drv_demo_1',
      name: 'Driver Demo 1',
      tenantId: tenant.id,
      phone: '5550001',
      vehiclePlate: 'FF-101',
    },
  });

  const driverTwo = await prisma.driver.upsert({
    where: { id: 'drv_demo_2' },
    update: {
      tenantId: tenant.id,
      name: 'Driver Demo 2',
      phone: '5550002',
      vehiclePlate: 'FF-202',
    },
    create: {
      id: 'drv_demo_2',
      name: 'Driver Demo 2',
      tenantId: tenant.id,
      phone: '5550002',
      vehiclePlate: 'FF-202',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Acme Retail' } },
    update: {
      contactEmail: 'ops@acmeretail.test',
      contactPhone: '312-555-4000',
    },
    create: {
      tenantId: tenant.id,
      name: 'Acme Retail',
      contactEmail: 'ops@acmeretail.test',
      contactPhone: '312-555-4000',
      addressLine1: '100 Main St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
    },
  });

  const shipmentIds = await seedShipments(tenant.id, customer.id);

  const serviceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const route = await prisma.route.upsert({
    where: { id: 'route_demo_1' },
    update: {
      name: 'Loop AM Wave',
      tenantId: tenant.id,
      serviceDate,
      status: 'PUBLISHED',
      driverId: driverOne.id,
      stops: {
        deleteMany: {},
        create: [
          { shipmentId: shipmentIds[1], sequence: 1, eta: addHours(serviceDate, 3) },
          { shipmentId: shipmentIds[2], sequence: 2, eta: addHours(serviceDate, 4) },
        ],
      },
    },
    create: {
      id: 'route_demo_1',
      name: 'Loop AM Wave',
      tenantId: tenant.id,
      serviceDate,
      status: 'PUBLISHED',
      driverId: driverOne.id,
      stops: {
        create: [
          { shipmentId: shipmentIds[1], sequence: 1, eta: addHours(serviceDate, 3) },
          { shipmentId: shipmentIds[2], sequence: 2, eta: addHours(serviceDate, 4) },
        ],
      },
    },
  });

  await prisma.shipment.update({ where: { id: shipmentIds[1] }, data: { status: 'ASSIGNED' } });
  await prisma.shipment.update({ where: { id: shipmentIds[2] }, data: { status: 'IN_TRANSIT' } });

  console.log('Seed completed', {
    tenant: tenant.name,
    dispatcher: 'dispatcher@fairflow.local / dispatch',
    drivers: [driverOne.id, driverTwo.id],
    route: route.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
