// Dados fixos para o teste de ponta a ponta dos apps nativos (só no CI).
// Roda DEPOIS de prisma/seed.ts, que gera revisões e pedidos com status
// aleatório. Aqui garantimos o que cada tela do teste precisa encontrar.
// Nunca rode contra produção: só usa as contas fictícias do seed.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { email: 'joao.silva@email.com' },
    include: { addresses: true, vehicles: true },
  });
  const mechanic = await prisma.admin.findUniqueOrThrow({ where: { email: 'mecanico@moria.com' } });
  const vehicle = customer.vehicles[0];
  const address = customer.addresses[0];
  if (!vehicle || !address) throw new Error('seed.ts não criou veículo/endereço do João');

  const categories = await prisma.checklistCategory.findMany({ include: { items: true }, orderBy: { order: 'asc' } });
  const items = categories.flatMap(category =>
    category.items.map(item => ({
      categoryId: category.id,
      categoryName: category.name,
      itemId: item.id,
      itemName: item.name,
    }))
  );
  if (items.length < 3) throw new Error('checklist vazio');
  const statusOf = (i: number) => (i === 0 ? 'CRITICAL' : i === 1 ? 'ATTENTION' : i < 8 ? 'OK' : 'NOT_CHECKED');
  const checklistItems = items.map((item, i) => ({
    ...item,
    status: statusOf(i),
    ...(i < 2 && { notes: 'Observação do teste E2E' }),
  }));

  const now = new Date();
  const assigned = { assignedMechanicId: mechanic.id, mechanicName: mechanic.name, assignedAt: now };

  // Cliente vê o relatório; mecânico vê o detalhe e o botão de PDF.
  await prisma.revision.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      date: now,
      mileage: 45000,
      status: 'COMPLETED',
      checklistItems,
      generalNotes: 'Revisão E2E concluída.',
      recommendations: 'Trocar pastilhas de freio.',
      completedAt: now,
      ...assigned,
    },
  });

  // Mecânico abre o orçamento ("Concluir") a partir desta.
  await prisma.revision.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      date: now,
      mileage: 46000,
      status: 'IN_PROGRESS',
      checklistItems,
      generalNotes: 'Revisão E2E em andamento.',
      ...assigned,
    },
  });

  const service = await prisma.service.findFirstOrThrow({ where: { status: 'ACTIVE' } });
  const price = Number(service.basePrice ?? 150);

  await prisma.serviceOrder.create({
    data: {
      status: 'OPEN',
      customerId: customer.id,
      vehicleId: vehicle.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      vehicleLabel: `${vehicle.model} ${vehicle.year} - ${vehicle.plate}`,
      vehiclePlate: vehicle.plate,
      description: 'OS do teste E2E',
      laborTotal: price,
      total: price,
      ...assigned,
      items: {
        create: [{ type: 'SERVICE', serviceId: service.id, name: service.name, unitPrice: price, quantity: 1, subtotal: price }],
      },
    },
  });

  // Orçamento respondido pela loja, esperando a aprovação do cliente.
  await prisma.order.create({
    data: {
      customerId: customer.id,
      addressId: address.id,
      status: 'PENDING',
      hasServices: true,
      quoteStatus: 'QUOTED',
      quotedAt: now,
      quoteNotes: 'Orçamento do teste E2E',
      subtotal: price,
      total: price,
      paymentMethod: 'PIX',
      items: {
        create: [
          {
            type: 'SERVICE',
            serviceId: service.id,
            name: service.name,
            price,
            quantity: 1,
            subtotal: price,
            priceQuoted: true,
            quotedPrice: price,
            quotedAt: now,
          },
        ],
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      customerId: customer.id,
      subject: 'Chamado E2E',
      category: 'REVISION_QUESTION',
      status: 'OPEN',
      messages: {
        create: [{ senderId: customer.id, senderType: 'customer', message: 'Mensagem do teste E2E.' }],
      },
    },
  });

  console.log('Dados do teste E2E criados.');
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
