import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: { id: 'demo-tenant', name: 'Demo Tenant' }
  });
  await prisma.user.upsert({
    where: { email: 'dispatcher@fairflow.local' },
    update: {},
    create: { email: 'dispatcher@fairflow.local', hashedPassword: 'dev', tenantId: tenant.id, role: 'DISPATCHER' }
  });
  const driver = await prisma.driver.upsert({
    where: { id: 'drv_demo_1' },
    update: {},
    create: { id: 'drv_demo_1', name: 'Driver Demo 1', tenantId: tenant.id, phone: '5550001' }
  });

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { name_tenantId: { name: 'Retail Hub', tenantId: tenant.id } },
      update: { contactEmail: 'ops@retailhub.test', contactPhone: '3125550100' },
      create: {
        name: 'Retail Hub', tenantId: tenant.id,
        contactEmail: 'ops@retailhub.test', contactPhone: '3125550100',
        addressLine1: '205 W Lake St', city: 'Chicago', state: 'IL', postalCode: '60606'
      }
    }),
    prisma.customer.upsert({
      where: { name_tenantId: { name: 'Chemline Labs', tenantId: tenant.id } },
      update: { contactEmail: 'labs@chemline.test' },
      create: {
        name: 'Chemline Labs', tenantId: tenant.id,
        contactEmail: 'labs@chemline.test',
        addressLine1: '980 S Michigan Ave', city: 'Chicago', state: 'IL', postalCode: '60605'
      }
    }),
    prisma.customer.upsert({
      where: { name_tenantId: { name: 'Northwind Supplies', tenantId: tenant.id } },
      update: {},
      create: {
        name: 'Northwind Supplies', tenantId: tenant.id,
        contactEmail: 'inbound@northwind.test', contactPhone: '3125550091',
        addressLine1: '400 N State St', city: 'Chicago', state: 'IL', postalCode: '60654'
      }
    })
  ]);

  const customerMap = new Map(customers.map((c) => [c.name, c]));

  const shipmentSeed = [
    { trackingCode: 'FF1001', customer: 'Retail Hub', address: '233 W Huron St', city: 'Chicago', state: 'IL', postal: '60654', status: 'ASSIGNED', serviceLevel: 'STANDARD', routeSequence: 1 },
    { trackingCode: 'FF1002', customer: 'Retail Hub', address: '412 N Wells St', city: 'Chicago', state: 'IL', postal: '60654', status: 'IN_TRANSIT', serviceLevel: 'EXPEDITED', routeSequence: 2 },
    { trackingCode: 'FF1003', customer: 'Chemline Labs', address: '980 S Michigan Ave', city: 'Chicago', state: 'IL', postal: '60605', status: 'CREATED', serviceLevel: 'STANDARD', routeSequence: 3 },
    { trackingCode: 'FF1004', customer: 'Northwind Supplies', address: '400 N State St', city: 'Chicago', state: 'IL', postal: '60654', status: 'DELIVERED', serviceLevel: 'STANDARD' },
    { trackingCode: 'FF1005', customer: 'Chemline Labs', address: '2300 S Archer Ave', city: 'Chicago', state: 'IL', postal: '60616', status: 'CREATED', serviceLevel: 'OVERNIGHT' }
  ];

  const shipments = [] as any[];
  for (const s of shipmentSeed) {
    const shipment = await prisma.shipment.upsert({
      where: { trackingCode: s.trackingCode },
      update: {
        status: s.status,
        addressLine1: s.address,
        city: s.city,
        state: s.state,
        postalCode: s.postal,
        serviceLevel: s.serviceLevel,
        customerId: customerMap.get(s.customer)?.id
      },
      create: {
        tenantId: tenant.id,
        trackingCode: s.trackingCode,
        status: s.status as any,
        addressLine1: s.address,
        city: s.city,
        state: s.state,
        postalCode: s.postal,
        serviceLevel: s.serviceLevel as any,
        customerId: customerMap.get(s.customer)?.id
      }
    });
    shipments.push({ ...shipment, routeSequence: s.routeSequence });
  }

  const route = await prisma.route.upsert({
    where: { id: 'route_demo_am' },
    update: { name: 'Chicago Loop AM', serviceDate: new Date(), tenantId: tenant.id, driverId: driver.id, status: 'PUBLISHED' },
    create: { id: 'route_demo_am', name: 'Chicago Loop AM', serviceDate: new Date(), tenantId: tenant.id, driverId: driver.id, status: 'PUBLISHED' }
  });

  await prisma.routeStop.deleteMany({ where: { routeId: route.id } });
  for (const shipment of shipments.filter((s) => s.routeSequence)) {
    await prisma.routeStop.create({
      data: {
        routeId: route.id,
        shipmentId: shipment.id,
        sequence: shipment.routeSequence,
        eta: new Date(Date.now() + shipment.routeSequence * 30 * 60000)
      }
    });
  }

  console.log('Seeded demo data, driver:', driver.id, 'shipments:', shipments.length);
}
main().finally(() => prisma.$disconnect());