import {
  AdminRole,
  AddressType,
  CustomerLevel,
  CustomerStatus,
  OrderItemType,
  OrderSource,
  OrderStatus,
  Prisma,
  ProductStatus,
  QuoteStatus,
  RevisionStatus,
  ServiceStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

import { prisma } from '@config/database.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { logger } from '@shared/utils/logger.util.js';

const DEFAULT_PASSWORD = 'Test123!';
type VehicleCatalogEntry = {
  make: string;
  country: string;
  models: Array<{
    name: string;
    segment: string;
    variants: string[];
  }>;
};

const states = [
  { city: 'Sao Paulo', state: 'SP' },
  { city: 'Guarulhos', state: 'SP' },
  { city: 'Campinas', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Niteroi', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Contagem', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Londrina', state: 'PR' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Caxias do Sul', state: 'RS' },
  { city: 'Florianopolis', state: 'SC' },
  { city: 'Joinville', state: 'SC' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Recife', state: 'PE' },
  { city: 'Goiania', state: 'GO' },
  { city: 'Brasilia', state: 'DF' },
] as const;

const firstNames = [
  'Joao', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Roberto', 'Fernanda',
  'Lucas', 'Camila', 'Ricardo', 'Patricia', 'Marcos', 'Aline', 'Bruno', 'Tatiana',
  'Felipe', 'Renata', 'Gustavo', 'Vanessa', 'Diego', 'Larissa', 'Rafael', 'Bianca',
  'Thiago', 'Daniela', 'Mateus', 'Amanda', 'Vinicius', 'Paula', 'Leandro', 'Beatriz',
  'Caio', 'Priscila', 'Andre', 'Monica', 'Eduardo', 'Karina', 'Murilo', 'Sabrina',
] as const;

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Costa', 'Souza', 'Lima', 'Alves', 'Rocha',
  'Martins', 'Fernandes', 'Pereira', 'Gomes', 'Ribeiro', 'Cardoso', 'Mendes', 'Barros',
  'Vieira', 'Carvalho', 'Teixeira', 'Moreira', 'Correia', 'Nunes', 'Batista', 'Moraes',
] as const;

const streetNames = [
  'Rua das Palmeiras',
  'Avenida Brasil',
  'Rua Sao Jose',
  'Rua do Comercio',
  'Avenida Central',
  'Rua das Acacias',
  'Rua Treze de Maio',
  'Avenida Paulista',
  'Rua Minas Gerais',
  'Rua dos Andradas',
] as const;

const neighborhoods = [
  'Centro',
  'Jardim America',
  'Vila Nova',
  'Boa Vista',
  'Santa Cecilia',
  'Bela Vista',
  'Jardim Europa',
  'Santo Antonio',
] as const;

const vehicleCatalog: VehicleCatalogEntry[] = [
  {
    make: 'Volkswagen',
    country: 'Germany',
    models: [
      { name: 'Gol', segment: 'hatch', variants: ['1.0 MPI', '1.6 MSI'] },
      { name: 'Polo', segment: 'hatch', variants: ['1.0 TSI', 'Comfortline 200 TSI'] },
      { name: 'T-Cross', segment: 'suv', variants: ['200 TSI', 'Highline 250 TSI'] },
    ],
  },
  {
    make: 'Chevrolet',
    country: 'United States',
    models: [
      { name: 'Onix', segment: 'hatch', variants: ['1.0 MT', 'Turbo AT'] },
      { name: 'Tracker', segment: 'suv', variants: ['LTZ Turbo', 'Premier Turbo'] },
      { name: 'S10', segment: 'pickup', variants: ['LT 2.8 Diesel', 'High Country 2.8'] },
    ],
  },
  {
    make: 'Fiat',
    country: 'Italy',
    models: [
      { name: 'Argo', segment: 'hatch', variants: ['1.0', 'Drive 1.3 AT'] },
      { name: 'Toro', segment: 'pickup', variants: ['Freedom Turbo 270', 'Volcano Diesel'] },
      { name: 'Cronos', segment: 'sedan', variants: ['Drive 1.0', 'Precision 1.3 AT'] },
    ],
  },
  {
    make: 'Toyota',
    country: 'Japan',
    models: [
      { name: 'Corolla', segment: 'sedan', variants: ['GLi 2.0', 'Altis Hybrid'] },
      { name: 'Hilux', segment: 'pickup', variants: ['SRX 2.8 Diesel', 'STD Power Pack'] },
      { name: 'Yaris', segment: 'hatch', variants: ['XL 1.5', 'XS Connect 1.5'] },
    ],
  },
  {
    make: 'Honda',
    country: 'Japan',
    models: [
      { name: 'City', segment: 'sedan', variants: ['EX 1.5', 'Touring 1.5'] },
      { name: 'HR-V', segment: 'suv', variants: ['EXL 1.5 Turbo', 'Advance 1.5 Turbo'] },
      { name: 'Fit', segment: 'hatch', variants: ['EX 1.5 CVT', 'LX 1.5 CVT'] },
    ],
  },
  {
    make: 'Hyundai',
    country: 'South Korea',
    models: [
      { name: 'HB20', segment: 'hatch', variants: ['Sense 1.0', 'Platinum 1.0 TGDI'] },
      { name: 'Creta', segment: 'suv', variants: ['Comfort 1.0 TGDI', 'Platinum 1.0 TGDI'] },
      { name: 'HB20S', segment: 'sedan', variants: ['Comfort Plus', 'Platinum Safety'] },
    ],
  },
];

const productTemplates = [
  { category: 'Freios', subcategory: 'Pastilhas', supplier: 'Bosch', priceMin: 89, priceMax: 239 },
  { category: 'Freios', subcategory: 'Discos', supplier: 'Fremax', priceMin: 149, priceMax: 369 },
  { category: 'Suspensao', subcategory: 'Amortecedores', supplier: 'Cofap', priceMin: 179, priceMax: 429 },
  { category: 'Suspensao', subcategory: 'Buchas', supplier: 'Axios', priceMin: 39, priceMax: 129 },
  { category: 'Motor', subcategory: 'Filtros', supplier: 'Mann Filter', priceMin: 29, priceMax: 119 },
  { category: 'Motor', subcategory: 'Correias', supplier: 'Contitech', priceMin: 59, priceMax: 219 },
  { category: 'Ignicao', subcategory: 'Velas', supplier: 'NGK', priceMin: 49, priceMax: 199 },
  { category: 'Lubrificantes', subcategory: 'Oleo', supplier: 'Mobil', priceMin: 44, priceMax: 89 },
  { category: 'Eletrica', subcategory: 'Bateria', supplier: 'Heliar', priceMin: 329, priceMax: 699 },
  { category: 'Climatizacao', subcategory: 'Filtro Cabine', supplier: 'Tecfil', priceMin: 29, priceMax: 69 },
] as const;

const serviceTemplates = [
  { name: 'Troca de oleo completa', category: 'Revisao', price: 189, estimatedTime: '1h 30min' },
  { name: 'Revisao de 10.000 km', category: 'Revisao', price: 349, estimatedTime: '3 horas' },
  { name: 'Revisao de 20.000 km', category: 'Revisao', price: 599, estimatedTime: '4 horas' },
  { name: 'Alinhamento e balanceamento', category: 'Suspensao', price: 129, estimatedTime: '1 hora' },
  { name: 'Troca de pastilhas dianteiras', category: 'Freios', price: 179, estimatedTime: '2 horas' },
  { name: 'Troca de amortecedores', category: 'Suspensao', price: 389, estimatedTime: '4 horas' },
  { name: 'Higienizacao de ar-condicionado', category: 'Climatizacao', price: 149, estimatedTime: '1 hora' },
  { name: 'Diagnostico eletronico', category: 'Eletrica', price: 99, estimatedTime: '45 min' },
  { name: 'Troca de kit correia dentada', category: 'Motor', price: 699, estimatedTime: '6 horas' },
  { name: 'Limpeza de bicos injetores', category: 'Motor', price: 219, estimatedTime: '2 horas' },
  { name: 'Troca de bateria', category: 'Eletrica', price: 79, estimatedTime: '30 min' },
  { name: 'Inspecao pre-compra', category: 'Diagnostico', price: 249, estimatedTime: '2 horas' },
] as const;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickManyUnique<T>(items: readonly T[], count: number): T[] {
  const copy = [...items];
  const result: T[] = [];
  while (copy.length > 0 && result.length < count) {
    result.push(copy.splice(randomInt(0, copy.length - 1), 1)[0]);
  }
  return result;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function decimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function generatePhone(index: number): string {
  return `1198${String(1000000 + index).slice(-7)}`;
}

function generateCpf(index: number): string {
  return String(10000000000 + index);
}

function generateZipCode(index: number): string {
  return String(10000000 + (index * 137) % 89999999).padStart(8, '0');
}

function generatePlate(index: number): string {
  const letters = ['BRA', 'MTR', 'CAR', 'M2A', 'HUB', 'SPX', 'RIO', 'PRA'];
  const prefix = letters[index % letters.length];
  return `${prefix}${String(1000 + index).slice(-4)}`;
}

function randomDateWithinDays(days: number): Date {
  return new Date(Date.now() - randomInt(1, days) * 24 * 60 * 60 * 1000);
}

function buildLandingSectionData() {
  return {
    header: JSON.stringify({
      enabled: true,
      logo: { url: '/logo_m2.png', alt: 'M2 Center Auto' },
      menuItems: [
        { id: '1', label: 'Inicio', href: '#inicio', isLink: false },
        { id: '2', label: 'Servicos', href: '#servicos', isLink: false },
        { id: '3', label: 'Pecas', href: '#pecas', isLink: false },
        { id: '4', label: 'Promocoes', href: '#promocoes', isLink: false },
      ],
    }),
    hero: JSON.stringify({
      enabled: true,
      title: 'M2 Center Auto',
      subtitle: 'Pecas, revisao e diagnostico com padrao de oficina especializada',
      description: 'Base de demonstracao com catalogo, servicos, pedidos e historico de revisoes para testes de fluxo.',
    }),
    marquee: JSON.stringify({
      enabled: true,
      items: [
        { id: '1', text: 'Revisoes programadas com historico completo' },
        { id: '2', text: 'Pecas com compatibilidade por veiculo' },
        { id: '3', text: 'Pedidos mistos de produtos e servicos' },
      ],
    }),
    about: JSON.stringify({
      enabled: true,
      title: 'Oficina completa',
      subtitle: 'Atendimento focado em manutencao preventiva, freios, suspensao e diagnostico.',
    }),
    products: JSON.stringify({ enabled: true, title: 'Catalogo de pecas' }),
    services: JSON.stringify({ enabled: true, title: 'Agenda de servicos' }),
    contactPage: JSON.stringify({ enabled: true }),
    aboutPage: JSON.stringify({ enabled: true }),
    contact: JSON.stringify({
      whatsapp: '5511999999999',
      email: 'contato@m2centerauto.com.br',
      city: 'Sao Paulo',
    }),
    footer: JSON.stringify({
      enabled: true,
      description: 'Ambiente de demonstracao para validacao de fluxos administrativos e do cliente.',
    }),
  };
}

async function ensureSettings(): Promise<void> {
  const exists = await prisma.settings.findFirst();
  if (exists) return;

  await prisma.settings.create({
    data: {
      storeName: 'M2 Center Auto',
      phone: '(11) 4000-3092',
      whatsapp: '5511999999999',
      email: 'contato@m2centerauto.com.br',
      address: 'Avenida dos Oficios, 3092',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '04547000',
    },
  });
}

async function ensureChecklist(): Promise<void> {
  const count = await prisma.checklistCategory.count();
  if (count > 0) return;

  const categories = [
    ['Freios', ['Pastilhas dianteiras', 'Discos dianteiros', 'Fluido de freio', 'Freio de mao']],
    ['Suspensao', ['Amortecedores', 'Buchas de bandeja', 'Pivos', 'Barra estabilizadora']],
    ['Motor', ['Oleo do motor', 'Filtro de oleo', 'Filtro de ar', 'Correias auxiliares']],
    ['Eletrica', ['Bateria', 'Alternador', 'Iluminacao', 'Scanner de avarias']],
    ['Pneus', ['Desgaste dianteiro', 'Desgaste traseiro', 'Calibragem', 'Estepe']],
  ] as const;

  for (const [index, category] of categories.entries()) {
    const created = await prisma.checklistCategory.create({
      data: {
        name: category[0],
        description: `Checklist padrao de ${category[0].toLowerCase()}`,
        order: index + 1,
        isDefault: true,
        isEnabled: true,
      },
    });

    await prisma.checklistItem.createMany({
      data: category[1].map((item, itemIndex) => ({
        categoryId: created.id,
        name: item,
        order: itemIndex + 1,
        isDefault: true,
        isEnabled: true,
      })),
    });
  }
}

async function ensureFaq(): Promise<void> {
  const count = await prisma.fAQCategory.count();
  if (count > 0) return;

  const categories = [
    {
      name: 'Pedidos',
      items: [
        ['Como acompanho meu pedido?', 'Acesse minha conta e consulte o rastreio ou o status interno do pedido.'],
        ['Posso retirar na oficina?', 'Sim, pedidos elegiveis podem ser retirados mediante agendamento.'],
      ],
    },
    {
      name: 'Servicos',
      items: [
        ['Como aprovo um orcamento?', 'Quando o servico exige cotacao, voce aprova diretamente no painel do cliente.'],
        ['Posso reagendar a revisao?', 'Sim, desde que a solicitacao seja feita antes do horario confirmado.'],
      ],
    },
    {
      name: 'Garantia',
      items: [
        ['As pecas tem garantia?', 'Sim, respeitando as regras do fabricante e o tipo de instalacao.'],
        ['Servicos tem garantia?', 'Servicos realizados pela oficina possuem garantia registrada na OS.'],
      ],
    },
  ] as const;

  for (const [index, category] of categories.entries()) {
    const created = await prisma.fAQCategory.create({
      data: {
        name: category.name,
        order: index + 1,
        isActive: true,
      },
    });

    await prisma.fAQItem.createMany({
      data: category.items.map(([question, answer], itemIndex) => ({
        categoryId: created.id,
        question,
        answer,
        order: itemIndex + 1,
        isActive: true,
      })),
    });
  }
}

export async function ensureDemoData(): Promise<void> {
  const [customerCount, productCount, orderCount] = await prisma.$transaction([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);

  if (customerCount > 0 || productCount > 0 || orderCount > 0) {
    logger.info('Skipping demo data seed because the database already contains business data', {
      customerCount,
      productCount,
      orderCount,
    });
    return;
  }

  logger.warn('Database is empty, creating demo data set for testing');

  await ensureSettings();
  await ensureChecklist();
  await ensureFaq();

  const latestLandingConfig = await prisma.landingPageConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (latestLandingConfig) {
    await prisma.landingPageConfig.update({
      where: { id: latestLandingConfig.id },
      data: buildLandingSectionData(),
    });
  }

  const passwordHash = await HashUtil.hashPassword(DEFAULT_PASSWORD);
  const admins = await prisma.admin.findMany({ orderBy: { createdAt: 'asc' } });
  const mechanic = admins.find((admin) => admin.role === AdminRole.STAFF) ?? admins[0] ?? null;

  const makeRecords = new Map<string, { id: string; models: Map<string, { id: string; variants: string[] }> }>();
  for (const make of vehicleCatalog) {
    const createdMake = await prisma.vehicleMake.create({
      data: {
        name: make.make,
        country: make.country,
        active: true,
      },
    });

    const modelMap = new Map<string, { id: string; variants: string[] }>();
    for (const model of make.models) {
      const createdModel = await prisma.vehicleModel.create({
        data: {
          makeId: createdMake.id,
          name: model.name,
          segment: model.segment,
          bodyType: '4-door',
          fuelTypes: ['Flex', 'Gasoline'],
          active: true,
        },
      });

      const variantIds: string[] = [];
      for (const [variantIndex, variant] of model.variants.entries()) {
        const createdVariant = await prisma.vehicleVariant.create({
          data: {
            modelId: createdModel.id,
            name: variant,
            transmission: variantIndex % 2 === 0 ? 'Manual 5-speed' : 'Automatic 6-speed',
            yearStart: 2018,
            yearEnd: null,
            engineInfo: { displacement: variant.includes('1.0') ? '1.0' : '1.6', fuel: 'Flex' },
            specifications: { abs: true, airbags: 2 + variantIndex },
            active: true,
          },
        });
        variantIds.push(createdVariant.id);
      }

      modelMap.set(model.name, { id: createdModel.id, variants: variantIds });
    }

    makeRecords.set(make.make, { id: createdMake.id, models: modelMap });
  }

  const products = [];
  for (const [templateIndex, template] of productTemplates.entries()) {
    for (let i = 0; i < 6; i++) {
      const suffix = templateIndex * 10 + i + 1;
      const salePrice = randomInt(template.priceMin, template.priceMax);
      const costPrice = Math.max(10, salePrice * 0.63);
      const name = `${template.subcategory} ${pickOne(['premium', 'performance', 'original', 'street', 'plus', 'pro'])} ${suffix}`;
      const createdProduct = await prisma.product.create({
        data: {
          name,
          description: `${name} com aplicacao em veiculos nacionais e importados, voltado para uso diario e manutencao preventiva.`,
          category: template.category,
          subcategory: template.subcategory,
          sku: `M2-${template.category.slice(0, 3).toUpperCase()}-${String(suffix).padStart(4, '0')}`,
          supplier: template.supplier,
          costPrice: decimal(costPrice),
          salePrice: decimal(salePrice),
          promoPrice: i % 3 === 0 ? decimal(salePrice * 0.9) : null,
          stock: randomInt(4, 38),
          minStock: randomInt(2, 8),
          images: [`https://images.m2centerauto.local/products/${slugify(name)}.jpg`],
          specifications: {
            brand: template.supplier,
            warrantyMonths: 12,
            line: i % 2 === 0 ? 'Original' : 'Aftermarket',
          },
          status: i % 7 === 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE,
          slug: slugify(`${name}-${suffix}`),
          metaDescription: `${name} com entrega rapida e suporte tecnico da M2 Center Auto.`,
        },
      });
      products.push(createdProduct);
    }
  }

  const services = [];
  for (const service of serviceTemplates) {
    services.push(
      await prisma.service.create({
        data: {
          name: service.name,
          description: `${service.name} realizada por equipe tecnica, com checklist e registro completo no historico do cliente.`,
          category: service.category,
          estimatedTime: service.estimatedTime,
          basePrice: decimal(service.price),
          specifications: { warrantyDays: 90, requiresInspection: service.price >= 300 },
          status: ServiceStatus.ACTIVE,
          slug: slugify(service.name),
          metaDescription: `${service.name} com atendimento especializado e atualizacao de status online.`,
        },
      })
    );
  }

  for (let i = 0; i < 80; i++) {
    const product = products[i % products.length];
    const make = pickOne(vehicleCatalog);
    const model = pickOne(make.models);
    const refs = makeRecords.get(make.make);
    const modelRef = refs?.models.get(model.name);

    await prisma.productVehicleCompatibility.create({
      data: {
        productId: product.id,
        makeId: refs?.id,
        modelId: modelRef?.id,
        variantId: modelRef?.variants[0] ?? null,
        yearStart: 2018,
        yearEnd: 2026,
        verified: i % 2 === 0,
        compatibilityData: {
          engine: pickOne(['1.0', '1.3', '1.5', '1.6', '2.0']),
          notes: 'Compatibilidade validada em catalogo interno.',
        },
      },
    });
  }

  const customers: Array<{
    id: string;
    name: string;
    email: string;
    addresses: Array<{ id: string }>;
  }> = [];

  for (let i = 0; i < 36; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i * 3) % lastNames.length];
    const location = states[i % states.length];
    const created = await prisma.customer.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: `${slugify(`${firstName}.${lastName}`)}${i + 1}@m2cliente.com.br`,
        password: passwordHash,
        phone: generatePhone(i),
        cpf: generateCpf(i),
        birthDate: new Date(1982 + (i % 18), i % 12, (i % 27) + 1),
        status: CustomerStatus.ACTIVE,
        level: [CustomerLevel.BRONZE, CustomerLevel.SILVER, CustomerLevel.GOLD, CustomerLevel.PLATINUM][i % 4],
        addresses: {
          create: [
            {
              type: AddressType.HOME,
              street: streetNames[i % streetNames.length],
              number: String(120 + i * 7),
              complement: i % 4 === 0 ? `Apto ${10 + i}` : null,
              neighborhood: neighborhoods[i % neighborhoods.length],
              city: location.city,
              state: location.state,
              zipCode: generateZipCode(i),
              isDefault: true,
            },
            {
              type: AddressType.WORK,
              street: streetNames[(i + 2) % streetNames.length],
              number: String(900 + i * 3),
              neighborhood: neighborhoods[(i + 2) % neighborhoods.length],
              city: location.city,
              state: location.state,
              zipCode: generateZipCode(i + 100),
              isDefault: false,
            },
          ],
        },
      },
      include: { addresses: { select: { id: true } } },
    });

    customers.push(created);
  }

  const vehicles = [];
  for (let i = 0; i < 34; i++) {
    const customer = customers[i % customers.length];
    const make = pickOne(vehicleCatalog);
    const model = pickOne(make.models);
    vehicles.push(
      await prisma.customerVehicle.create({
        data: {
          customerId: customer.id,
          brand: make.make,
          model: `${model.name} ${pickOne(model.variants)}`,
          year: 2017 + (i % 9),
          plate: generatePlate(i),
          chassisNumber: `9BWZZZ377VT${String(100000 + i).slice(-6)}`,
          color: pickOne(['Branco', 'Prata', 'Preto', 'Cinza', 'Vermelho', 'Azul']),
          mileage: 28000 + i * 4700,
        },
      })
    );
  }

  const coupons = await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'BEMVINDO10',
        description: '10% de desconto na primeira compra',
        discountType: 'PERCENTAGE',
        discountValue: decimal(10),
        minValue: decimal(150),
        maxDiscount: decimal(120),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        usageLimit: 200,
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'REVISAO50',
        description: 'R$ 50 de desconto em servicos selecionados',
        discountType: 'FIXED',
        discountValue: decimal(50),
        minValue: decimal(300),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimit: 120,
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'FRETEGRATIS',
        description: 'Frete gratis para pedidos acima de R$ 299',
        discountType: 'FIXED',
        discountValue: decimal(25),
        minValue: decimal(299),
        expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        usageLimit: 300,
        isActive: true,
      },
    }),
  ]);

  await Promise.all([
    prisma.promotion.create({
      data: {
        name: 'Semana da revisao preventiva',
        description: 'Pacotes de revisao com desconto e checkup adicional.',
        shortDescription: 'Descontos em servicos de manutencao preventiva.',
        type: 'PERCENTAGE',
        target: 'SPECIFIC_SERVICES',
        trigger: 'CART_VALUE',
        customerSegments: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
        rules: [{ minOrderValue: 250 }],
        rewards: { primary: { type: 'PERCENTAGE', value: 12 } },
        schedule: { timezone: 'America/Sao_Paulo', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        canCombineWithOthers: false,
        priority: 10,
        autoApply: true,
        isActive: true,
        createdBy: 'system',
      } as Prisma.PromotionUncheckedCreateInput,
    }),
    prisma.promotion.create({
      data: {
        name: 'Kit freios em oferta',
        description: 'Desconto progressivo em itens de freio selecionados.',
        shortDescription: 'Economia em kits de freio e discos.',
        type: 'FIXED',
        target: 'SPECIFIC_PRODUCTS',
        trigger: 'ITEM_QUANTITY',
        customerSegments: ['GOLD', 'PLATINUM'],
        rules: [{ minItems: 2 }],
        rewards: { primary: { type: 'FIXED', value: 40 } },
        targetCategories: ['Freios'],
        schedule: { timezone: 'America/Sao_Paulo' },
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        canCombineWithOthers: true,
        priority: 8,
        autoApply: false,
        code: 'KITFREIO40',
        isActive: true,
        createdBy: 'system',
      },
    }),
  ]);

  const checklistCategories = await prisma.checklistCategory.findMany({
    include: { items: true },
    orderBy: { order: 'asc' },
  });

  const favoritesCreated = new Set<string>();
  for (let i = 0; i < 72; i++) {
    const customer = customers[i % customers.length];
    const product = products[(i * 5) % products.length];
    const key = `${customer.id}:${product.id}`;
    if (favoritesCreated.has(key)) continue;
    favoritesCreated.add(key);
    await prisma.favorite.create({
      data: {
        customerId: customer.id,
        productId: product.id,
      },
    });
  }

  const paymentMethods = ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_SLIP'] as const;
  const orderStatuses = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.IN_PRODUCTION,
    OrderStatus.PREPARING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ] as const;

  for (let i = 0; i < 84; i++) {
    const customer = customers[i % customers.length];
    const addressId = customer.addresses[0]?.id;
    if (!addressId) continue;

    const productItems = pickManyUnique(products, randomInt(1, 3)).map((product) => {
      const quantity = randomInt(1, 3);
      const unitPrice = Number(product.promoPrice ?? product.salePrice);
      return {
        type: OrderItemType.PRODUCT,
        name: product.name,
        productId: product.id,
        quantity,
        price: decimal(unitPrice),
        subtotal: decimal(unitPrice * quantity),
      };
    });

    const serviceItems = i % 3 === 0
      ? pickManyUnique(services, randomInt(1, 2)).map((service) => ({
          type: OrderItemType.SERVICE,
          name: service.name,
          serviceId: service.id,
          quantity: 1,
          price: decimal(Number(service.basePrice ?? 0)),
          subtotal: decimal(Number(service.basePrice ?? 0)),
          priceQuoted: i % 6 !== 0,
          quotedPrice: i % 6 !== 0 ? decimal(Number(service.basePrice ?? 0) * 1.05) : null,
          quotedAt: i % 6 !== 0 ? randomDateWithinDays(40) : null,
        }))
      : [];

    const allItems = [...productItems, ...serviceItems];
    const subtotal = allItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const discountAmount = i % 5 === 0 ? Math.min(50, subtotal * 0.1) : 0;
    const total = subtotal - discountAmount;
    const status = orderStatuses[i % orderStatuses.length];
    const createdAt = randomDateWithinDays(120);
    const quoteStatus = serviceItems.length === 0
      ? null
      : status === OrderStatus.CANCELLED
        ? QuoteStatus.REJECTED
        : status === OrderStatus.PENDING
          ? QuoteStatus.ANALYZING
          : QuoteStatus.APPROVED;

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        addressId,
        status,
        source: [OrderSource.WEB, OrderSource.APP, OrderSource.PHONE][i % 3],
        hasProducts: productItems.length > 0,
        hasServices: serviceItems.length > 0,
        quoteStatus,
        quotedAt: quoteStatus && quoteStatus !== QuoteStatus.ANALYZING ? new Date(createdAt.getTime() + 4 * 60 * 60 * 1000) : null,
        quoteApprovedAt: quoteStatus === QuoteStatus.APPROVED ? new Date(createdAt.getTime() + 12 * 60 * 60 * 1000) : null,
        quoteNotes: serviceItems.length > 0 ? 'Servico inspecionado e liberado para execucao.' : null,
        subtotal: decimal(subtotal),
        discountAmount: decimal(discountAmount),
        total: decimal(total),
        paymentMethod: paymentMethods[i % paymentMethods.length],
        trackingCode:
          status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED
            ? `BR${String(100000000000 + i)}`
            : null,
        estimatedDelivery: status === OrderStatus.CANCELLED ? null : new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000),
        deliveredAt: status === OrderStatus.DELIVERED ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        couponCode: discountAmount > 0 ? coupons[i % coupons.length].code : null,
        appliedPromotions: discountAmount > 0 ? ['Semana da revisao preventiva'] : [],
        createdAt,
        cancelledAt: status === OrderStatus.CANCELLED ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
        items: { create: allItems },
      },
    });

    if (discountAmount > 0) {
      await prisma.couponUsage.create({
        data: {
          couponId: coupons[i % coupons.length].id,
          customerId: customer.id,
          orderId: order.id,
          discountAmount: decimal(discountAmount),
          orderValue: decimal(subtotal),
        },
      });
    }
  }

  for (let i = 0; i < 28; i++) {
    const vehicle = vehicles[i % vehicles.length];
    const checklistItems = checklistCategories.flatMap((category) =>
      category.items.map((item) => ({
        categoryId: category.id,
        categoryName: category.name,
        itemId: item.id,
        itemName: item.name,
        status: pickOne(['OK', 'OK', 'ATTENTION', 'NOT_CHECKED', 'CRITICAL']),
        notes: i % 4 === 0 ? `Observacao tecnica registrada para ${item.name.toLowerCase()}.` : undefined,
      }))
    );
    const createdAt = randomDateWithinDays(150);
    const status = [RevisionStatus.DRAFT, RevisionStatus.IN_PROGRESS, RevisionStatus.COMPLETED][i % 3];

    await prisma.revision.create({
      data: {
        customerId: vehicle.customerId,
        vehicleId: vehicle.id,
        date: createdAt,
        mileage: vehicle.mileage ? vehicle.mileage + randomInt(500, 8000) : null,
        status,
        checklistItems,
        generalNotes: 'Revisao registrada a partir de seed de demonstracao com apontamentos realistas.',
        recommendations: status === RevisionStatus.COMPLETED ? 'Retornar em 8.000 km para nova avaliacao preventiva.' : null,
        assignedMechanicId: mechanic?.id ?? null,
        mechanicName: mechanic?.name ?? null,
        assignedAt: mechanic ? new Date(createdAt.getTime() + 30 * 60 * 1000) : null,
        createdAt,
        completedAt: status === RevisionStatus.COMPLETED ? new Date(createdAt.getTime() + 3 * 60 * 60 * 1000) : null,
      },
    });
  }

  for (let i = 0; i < 18; i++) {
    const customer = customers[i % customers.length];
    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: customer.id,
        subject: pickOne([
          'Duvida sobre compatibilidade de peca',
          'Acompanhamento de pedido em transporte',
          'Solicitacao de ajuste no orcamento',
          'Reagendamento de revisao',
          'Consulta sobre garantia do servico',
        ]),
        category: [
          TicketCategory.PRODUCT_QUESTION,
          TicketCategory.DELIVERY_ISSUE,
          TicketCategory.REVISION_QUESTION,
          TicketCategory.ORDER_ISSUE,
          TicketCategory.TECHNICAL_SUPPORT,
        ][i % 5],
        priority: [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH][i % 3],
        status: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_CUSTOMER, TicketStatus.RESOLVED][i % 4],
        assignedToId: admins[i % admins.length]?.id ?? null,
        assignedAt: randomDateWithinDays(30),
        createdAt: randomDateWithinDays(40),
        resolvedAt: i % 4 === 3 ? randomDateWithinDays(10) : null,
      },
    });

    await prisma.ticketMessage.createMany({
      data: [
        {
          ticketId: ticket.id,
          senderId: customer.id,
          senderType: 'CUSTOMER',
          message: 'Preciso confirmar a aplicacao correta e o prazo desse atendimento.',
          createdAt: randomDateWithinDays(35),
        },
        {
          ticketId: ticket.id,
          senderId: admins[i % admins.length]?.id ?? 'system',
          senderType: 'ADMIN',
          message: 'Recebemos a solicitacao e estamos verificando os detalhes para retorno.',
          createdAt: randomDateWithinDays(34),
          isInternal: false,
        },
      ],
    });
  }

  const customerSummaries = await prisma.order.groupBy({
    by: ['customerId'],
    _count: { _all: true },
    _sum: { total: true },
  });

  for (const summary of customerSummaries) {
    await prisma.customer.update({
      where: { id: summary.customerId },
      data: {
        totalOrders: summary._count._all,
        totalSpent: summary._sum.total ?? decimal(0),
      },
    });
  }

  logger.warn('Demo data created successfully', {
    admins: admins.length,
    customers: customers.length,
    vehicles: vehicles.length,
    products: products.length,
    services: services.length,
    orders: 84,
    revisions: 28,
    tickets: 18,
    credentials: {
      admin: 'admin@m2centerauto.com.br / Test123!',
      customer: customers[0]?.email ? `${customers[0].email} / Test123!` : null,
    },
  });
}
