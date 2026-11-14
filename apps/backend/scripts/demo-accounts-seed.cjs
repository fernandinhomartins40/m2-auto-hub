// Dados de demonstração para as contas de revisão das lojas (Apple/Google) e de gravação.
// Roda dentro do container do backend em produção, pelo workflow "Contas de demonstração".
// Só ACRESCENTA dados às 4 contas abaixo; não apaga nem altera nada de outros clientes.
// Pode rodar de novo: se a conta já tem a revisão de demonstração, ela é pulada.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const MARK = 'Revisão de demonstração do app.';
const PAIRS = [
  { customer: 'apple.revisor.cliente@m2centerauto.com.br', mechanic: 'apple.revisor.mecanico@m2centerauto.com.br' },
  { customer: 'gravacao.cliente@m2centerauto.com.br', mechanic: 'gravacao.mecanico@m2centerauto.com.br' },
];

async function seedPair({ customer: customerEmail, mechanic: mechanicEmail }) {
  const customer = await prisma.customer.findUnique({
    where: { email: customerEmail },
    include: { addresses: true, vehicles: true },
  });
  const mechanic = await prisma.admin.findUnique({ where: { email: mechanicEmail } });
  if (!customer || !mechanic) throw new Error(`Conta não encontrada: ${!customer ? customerEmail : mechanicEmail}`);
  if (mechanic.role !== 'STAFF') throw new Error(`${mechanicEmail} não é mecânico (papel ${mechanic.role})`);

  const done = await prisma.revision.findFirst({ where: { customerId: customer.id, generalNotes: MARK } });
  if (done) {
    console.log(`${customerEmail}: já tem os dados de demonstração, pulando.`);
    return;
  }

  const vehicle =
    customer.vehicles[0] ??
    (await prisma.customerVehicle.create({
      data: { customerId: customer.id, brand: 'Volkswagen', model: 'Gol 1.0', year: 2020, plate: 'DEM0A01', color: 'Prata', mileage: 45000 },
    }));
  const address =
    customer.addresses[0] ??
    (await prisma.address.create({
      data: {
        customerId: customer.id,
        street: 'Rua das Oficinas',
        number: '100',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01001000',
        isDefault: true,
      },
    }));

  const categories = await prisma.checklistCategory.findMany({ include: { items: true }, orderBy: { order: 'asc' } });
  const items = categories.flatMap(c => c.items.map(i => ({ categoryId: c.id, categoryName: c.name, itemId: i.id, itemName: i.name })));
  // A loja pode ainda não ter configurado o checklist: aí a revisão sai sem itens.
  const statusOf = i => (i === 0 ? 'ATTENTION' : 'OK');
  const checklistItems = items.map((item, i) => ({
    ...item,
    status: statusOf(i),
    ...(i === 0 && { notes: 'Pastilhas com desgaste; trocar na próxima visita.' }),
  }));

  // Sem serviço cadastrado na loja, o item sai só com nome e preço (serviceId é opcional).
  const service = await prisma.service.findFirst({ where: { status: 'ACTIVE' } });
  const serviceName = service?.name ?? 'Troca das pastilhas de freio dianteiras';
  const product = await prisma.product.findFirst({ where: { status: 'ACTIVE' } });
  const servicePrice = Number(service?.basePrice ?? 189.9);
  const now = new Date();
  const days = n => new Date(now.getTime() + n * 86400000);
  const assigned = { assignedMechanicId: mechanic.id, mechanicName: mechanic.name, assignedAt: now };

  // Revisão concluída: cliente vê o relatório; mecânico vê o detalhe e o PDF.
  await prisma.revision.create({
    data: {
      customerId: customer.id, vehicleId: vehicle.id, date: days(-7), mileage: 45000, status: 'COMPLETED',
      checklistItems, generalNotes: MARK, recommendations: 'Trocar as pastilhas de freio dianteiras em até 2.000 km.',
      completedAt: days(-7), ...assigned,
    },
  });
  // Revisão agendada para o mecânico começar.
  await prisma.revision.create({
    data: {
      customerId: customer.id, vehicleId: vehicle.id, date: days(2), mileage: 47000, status: 'DRAFT',
      checklistItems: [], generalNotes: 'Revisão agendada.', ...assigned,
    },
  });

  // Ordem de serviço aberta, atribuída ao mecânico.
  await prisma.serviceOrder.create({
    data: {
      status: 'OPEN', customerId: customer.id, vehicleId: vehicle.id, customerName: customer.name, customerPhone: customer.phone,
      vehicleLabel: `${vehicle.model} ${vehicle.year} - ${vehicle.plate}`, vehiclePlate: vehicle.plate,
      description: 'Troca das pastilhas de freio dianteiras.', laborTotal: servicePrice, total: servicePrice, ...assigned,
      items: { create: [{ type: 'SERVICE', serviceId: service?.id, name: serviceName, unitPrice: servicePrice, quantity: 1, subtotal: servicePrice }] },
    },
  });

  // Orçamento respondido pela loja, esperando a aprovação do cliente.
  await prisma.order.create({
    data: {
      customerId: customer.id, addressId: address.id, status: 'PENDING', hasServices: true, quoteStatus: 'QUOTED', quotedAt: now,
      quoteNotes: 'Orçamento para a troca das pastilhas de freio.', subtotal: servicePrice, total: servicePrice, paymentMethod: 'PIX',
      items: {
        create: [{ type: 'SERVICE', serviceId: service?.id, name: serviceName, price: servicePrice, quantity: 1, subtotal: servicePrice,
          priceQuoted: true, quotedPrice: servicePrice, quotedAt: now }],
      },
    },
  });

  // Pedido de peça já confirmado (sem produto cadastrado, o item sai só com nome e preço).
  const p = product ? Number(product.promoPrice ?? product.salePrice) : 49.9;
  await prisma.order.create({
    data: {
      customerId: customer.id, addressId: address.id, status: 'CONFIRMED', subtotal: p * 2, total: p * 2, paymentMethod: 'PIX',
      items: { create: [{ type: 'PRODUCT', productId: product?.id, name: product?.name ?? 'Óleo de motor 5W30 1L', price: p, quantity: 2, subtotal: p * 2 }] },
    },
  });

  console.log(`${customerEmail} + ${mechanicEmail}: dados de demonstração criados.`);
}

(async () => {
  for (const pair of PAIRS) await seedPair(pair);
})()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
