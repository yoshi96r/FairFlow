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
  for (let i = 1; i <= 6; i++) {
    await prisma.shipment.create({ data: {
      tenantId: tenant.id,
      trackingCode: `FF${1000 + i}`,
      addressLine1: `${100 + i} Market St`, city: 'Chicago', state: 'IL', postalCode: '60601',
      serviceLevel: 'STANDARD'
    }});
  }
  console.log('Seeded demo data, driver:', driver.id);
}
main().finally(() => prisma.$disconnect());