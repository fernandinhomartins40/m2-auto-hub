import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed default checklist categories and items for vehicle revisions
 */
export async function seedChecklist() {
  console.log('🔧 Seeding checklist categories and items...');

  // Check if checklist already exists
  const existingCategories = await prisma.checklistCategory.count();
  if (existingCategories > 0) {
    console.log('✅ Checklist already seeded, skipping...');
    return;
  }

  // 1. Motor
  const motorCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Motor',
      description: 'Verificações relacionadas ao motor do veículo',
      icon: 'engine',
      order: 1,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: motorCategory.id,
        name: 'Nível de óleo do motor',
        description: 'Verificar nível e qualidade do óleo',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: motorCategory.id,
        name: 'Filtro de óleo',
        description: 'Verificar condição do filtro',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: motorCategory.id,
        name: 'Filtro de ar',
        description: 'Verificar limpeza e condição',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: motorCategory.id,
        name: 'Correia dentada',
        description: 'Verificar tensão e desgaste',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: motorCategory.id,
        name: 'Velas de ignição',
        description: 'Verificar estado das velas',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: motorCategory.id,
        name: 'Bateria',
        description: 'Verificar terminais e carga',
        order: 6,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 2. Fluidos
  const fluidosCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Fluidos',
      description: 'Verificação de todos os fluidos do veículo',
      icon: 'droplet',
      order: 2,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: fluidosCategory.id,
        name: 'Fluido de arrefecimento',
        description: 'Verificar nível e cor',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: fluidosCategory.id,
        name: 'Fluido de freio',
        description: 'Verificar nível e qualidade',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: fluidosCategory.id,
        name: 'Fluido de direção hidráulica',
        description: 'Verificar nível (se aplicável)',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: fluidosCategory.id,
        name: 'Fluido de transmissão',
        description: 'Verificar nível e cor',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: fluidosCategory.id,
        name: 'Água do limpador',
        description: 'Completar reservatório',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 3. Freios
  const freiosCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Freios',
      description: 'Sistema de frenagem do veículo',
      icon: 'brake-warning',
      order: 3,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: freiosCategory.id,
        name: 'Pastilhas de freio (dianteiras)',
        description: 'Verificar espessura',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: freiosCategory.id,
        name: 'Pastilhas de freio (traseiras)',
        description: 'Verificar espessura',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: freiosCategory.id,
        name: 'Discos de freio',
        description: 'Verificar desgaste e empenamento',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: freiosCategory.id,
        name: 'Mangueiras de freio',
        description: 'Verificar vazamentos',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: freiosCategory.id,
        name: 'Freio de mão',
        description: 'Testar eficiência',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 4. Suspensão
  const suspensaoCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Suspensão',
      description: 'Sistema de suspensão e amortecimento',
      icon: 'settings',
      order: 4,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: suspensaoCategory.id,
        name: 'Amortecedores',
        description: 'Verificar vazamentos e eficiência',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: suspensaoCategory.id,
        name: 'Molas',
        description: 'Verificar trincas e deformação',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: suspensaoCategory.id,
        name: 'Buchas e coxins',
        description: 'Verificar desgaste',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: suspensaoCategory.id,
        name: 'Barra estabilizadora',
        description: 'Verificar fixação e desgaste',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: suspensaoCategory.id,
        name: 'Pivôs e bandejas',
        description: 'Verificar folgas',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 5. Pneus e Rodas
  const pneusCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Pneus e Rodas',
      description: 'Verificação de pneus, rodas e alinhamento',
      icon: 'circle',
      order: 5,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: pneusCategory.id,
        name: 'Calibragem dos pneus',
        description: 'Verificar e ajustar pressão',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: pneusCategory.id,
        name: 'Profundidade dos sulcos',
        description: 'Medir desgaste dos pneus',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: pneusCategory.id,
        name: 'Desgaste irregular',
        description: 'Verificar sinais de desalinhamento',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: pneusCategory.id,
        name: 'Pneu estepe',
        description: 'Verificar estado e calibragem',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: pneusCategory.id,
        name: 'Rodas e parafusos',
        description: 'Verificar amassados e torque',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: pneusCategory.id,
        name: 'Alinhamento',
        description: 'Verificar necessidade de alinhamento',
        order: 6,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: pneusCategory.id,
        name: 'Balanceamento',
        description: 'Verificar vibração em velocidade',
        order: 7,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 6. Iluminação
  const iluminacaoCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Iluminação',
      description: 'Sistema de iluminação do veículo',
      icon: 'lightbulb',
      order: 6,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: iluminacaoCategory.id,
        name: 'Faróis (alto e baixo)',
        description: 'Verificar funcionamento e regulagem',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: iluminacaoCategory.id,
        name: 'Lanternas traseiras',
        description: 'Verificar funcionamento',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: iluminacaoCategory.id,
        name: 'Luz de freio',
        description: 'Verificar funcionamento',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: iluminacaoCategory.id,
        name: 'Pisca-pisca',
        description: 'Verificar funcionamento',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: iluminacaoCategory.id,
        name: 'Luz de ré',
        description: 'Verificar funcionamento',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: iluminacaoCategory.id,
        name: 'Luz da placa',
        description: 'Verificar funcionamento',
        order: 6,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 7. Interior
  const interiorCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Interior',
      description: 'Verificações do interior do veículo',
      icon: 'car-front',
      order: 7,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: interiorCategory.id,
        name: 'Cintos de segurança',
        description: 'Verificar travamento e recolhimento',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: interiorCategory.id,
        name: 'Airbags',
        description: 'Verificar luz de aviso',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: interiorCategory.id,
        name: 'Ar-condicionado',
        description: 'Testar funcionamento e refrigeração',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: interiorCategory.id,
        name: 'Vidros elétricos',
        description: 'Testar todos os vidros',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: interiorCategory.id,
        name: 'Travas elétricas',
        description: 'Verificar funcionamento',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: interiorCategory.id,
        name: 'Painel de instrumentos',
        description: 'Verificar luzes de advertência',
        order: 6,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  // 8. Exterior
  const exteriorCategory = await prisma.checklistCategory.create({
    data: {
      name: 'Exterior',
      description: 'Verificações externas do veículo',
      icon: 'scan',
      order: 8,
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        categoryId: exteriorCategory.id,
        name: 'Limpadores de para-brisa',
        description: 'Verificar palhetas e funcionamento',
        order: 1,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: exteriorCategory.id,
        name: 'Retrovisores',
        description: 'Verificar ajuste e vidros',
        order: 2,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: exteriorCategory.id,
        name: 'Buzina',
        description: 'Testar funcionamento',
        order: 3,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: exteriorCategory.id,
        name: 'Fechaduras',
        description: 'Verificar portas e porta-malas',
        order: 4,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: exteriorCategory.id,
        name: 'Lataria',
        description: 'Verificar amassados e ferrugem',
        order: 5,
        isDefault: true,
        isEnabled: true,
      },
      {
        categoryId: exteriorCategory.id,
        name: 'Vidros e para-brisas',
        description: 'Verificar trincas e chips',
        order: 6,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });

  const totalCategories = await prisma.checklistCategory.count();
  const totalItems = await prisma.checklistItem.count();

  console.log(`✅ Checklist seeded successfully!`);
  console.log(`   - ${totalCategories} categories created`);
  console.log(`   - ${totalItems} items created`);
}
