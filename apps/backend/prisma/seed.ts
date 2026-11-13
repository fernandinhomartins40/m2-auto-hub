import { PrismaClient, CustomerStatus, CustomerLevel, ProductStatus, ServiceStatus, OrderStatus, OrderSource, OrderItemType, RevisionStatus, AddressType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedFAQ } from './seeds/faq-seed.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('🗑️  Clearing existing data...');
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.fAQItem.deleteMany();
  await prisma.fAQCategory.deleteMany();
  await prisma.revision.deleteMany();
  await prisma.customerVehicle.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklistCategory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.productVehicleCompatibility.deleteMany();
  await prisma.vehicleVariant.deleteMany();
  await prisma.vehicleModel.deleteMany();
  await prisma.vehicleMake.deleteMany();
  await prisma.service.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();

  // =========================================================================
  // ADMINS (LOJISTAS)
  // =========================================================================
  console.log('👨‍💼 Creating admins...');
  const hashedPassword = await bcrypt.hash('Test123!', 10);

  const admins = await Promise.all([
    prisma.admin.create({
      data: {
        email: 'admin@moria.com',
        password: hashedPassword,
        name: 'Carlos Administrador',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        permissions: ['ALL'],
      },
    }),
    prisma.admin.create({
      data: {
        email: 'gerente@moria.com',
        password: hashedPassword,
        name: 'Ana Gerente',
        role: 'MANAGER',
        status: 'ACTIVE',
        permissions: ['products', 'services', 'orders', 'customers', 'revisions'],
      },
    }),
    prisma.admin.create({
      data: {
        email: 'mecanico@moria.com',
        password: hashedPassword,
        name: 'João Mecânico',
        role: 'STAFF',
        status: 'ACTIVE',
        permissions: ['revisions', 'vehicles', 'checklist'],
      },
    }),
    prisma.admin.create({
      data: {
        email: 'vendedor@moria.com',
        password: hashedPassword,
        name: 'Roberto Vendedor',
        role: 'STAFF',
        status: 'ACTIVE',
        permissions: ['orders', 'customers', 'products'],
      },
    }),
  ]);

  console.log(`✅ Created ${admins.length} admins`);

  // =========================================================================
  // CUSTOMERS (25 clientes com perfis variados)
  // =========================================================================
  console.log('👥 Creating customers...');

  const customerData = [
    { name: 'João Silva', email: 'joao.silva@email.com', phone: '11987654321', cpf: '12345678901', level: CustomerLevel.GOLD, totalOrders: 15, totalSpent: 4500.00, city: 'São Paulo', state: 'SP' },
    { name: 'Maria Santos', email: 'maria.santos@email.com', phone: '21987654321', cpf: '23456789012', level: CustomerLevel.SILVER, totalOrders: 8, totalSpent: 2300.00, city: 'Rio de Janeiro', state: 'RJ' },
    { name: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', phone: '31987654321', cpf: '34567890123', level: CustomerLevel.PLATINUM, totalOrders: 28, totalSpent: 9800.00, city: 'Belo Horizonte', state: 'MG' },
    { name: 'Ana Costa', email: 'ana.costa@email.com', phone: '11976543210', cpf: '45678901234', level: CustomerLevel.BRONZE, totalOrders: 3, totalSpent: 850.00, city: 'São Paulo', state: 'SP' },
    { name: 'Carlos Souza', email: 'carlos.souza@email.com', phone: '85987654321', cpf: '56789012345', level: CustomerLevel.GOLD, totalOrders: 12, totalSpent: 3600.00, city: 'Fortaleza', state: 'CE' },
    { name: 'Juliana Lima', email: 'juliana.lima@email.com', phone: '71987654321', cpf: '67890123456', level: CustomerLevel.SILVER, totalOrders: 7, totalSpent: 1900.00, city: 'Salvador', state: 'BA' },
    { name: 'Roberto Alves', email: 'roberto.alves@email.com', phone: '41987654321', cpf: '78901234567', level: CustomerLevel.GOLD, totalOrders: 18, totalSpent: 5200.00, city: 'Curitiba', state: 'PR' },
    { name: 'Fernanda Rocha', email: 'fernanda.rocha@email.com', phone: '51987654321', cpf: '89012345678', level: CustomerLevel.PLATINUM, totalOrders: 32, totalSpent: 11500.00, city: 'Porto Alegre', state: 'RS' },
    { name: 'Lucas Martins', email: 'lucas.martins@email.com', phone: '61987654321', cpf: '90123456789', level: CustomerLevel.BRONZE, totalOrders: 2, totalSpent: 450.00, city: 'Brasília', state: 'DF' },
    { name: 'Camila Fernandes', email: 'camila.fernandes@email.com', phone: '11965432109', cpf: '01234567890', level: CustomerLevel.SILVER, totalOrders: 9, totalSpent: 2700.00, city: 'São Paulo', state: 'SP' },
    { name: 'Ricardo Pereira', email: 'ricardo.pereira@email.com', phone: '48987654321', cpf: '11234567890', level: CustomerLevel.GOLD, totalOrders: 14, totalSpent: 4100.00, city: 'Florianópolis', state: 'SC' },
    { name: 'Patrícia Gomes', email: 'patricia.gomes@email.com', phone: '81987654321', cpf: '21234567890', level: CustomerLevel.SILVER, totalOrders: 6, totalSpent: 1650.00, city: 'Recife', state: 'PE' },
    { name: 'Marcos Ribeiro', email: 'marcos.ribeiro@email.com', phone: '11954321098', cpf: '31234567890', level: CustomerLevel.BRONZE, totalOrders: 4, totalSpent: 1100.00, city: 'São Paulo', state: 'SP' },
    { name: 'Aline Cardoso', email: 'aline.cardoso@email.com', phone: '21976543210', cpf: '41234567890', level: CustomerLevel.GOLD, totalOrders: 16, totalSpent: 4800.00, city: 'Rio de Janeiro', state: 'RJ' },
    { name: 'Bruno Mendes', email: 'bruno.mendes@email.com', phone: '11943210987', cpf: '51234567890', level: CustomerLevel.PLATINUM, totalOrdens: 25, totalSpent: 8900.00, city: 'São Paulo', state: 'SP' },
    { name: 'Tatiana Barros', email: 'tatiana.barros@email.com', phone: '31976543210', cpf: '61234567890', level: CustomerLevel.SILVER, totalOrders: 10, totalSpent: 2950.00, city: 'Belo Horizonte', state: 'MG' },
    { name: 'Felipe Santos', email: 'felipe.santos@email.com', phone: '11932109876', cpf: '71234567890', level: CustomerLevel.BRONZE, totalOrders: 1, totalSpent: 280.00, city: 'São Paulo', state: 'SP' },
    { name: 'Renata Costa', email: 'renata.costa@email.com', phone: '85976543210', cpf: '81234567890', level: CustomerLevel.GOLD, totalOrders: 13, totalSpent: 3850.00, city: 'Fortaleza', state: 'CE' },
    { name: 'Gustavo Lima', email: 'gustavo.lima@email.com', phone: '71976543210', cpf: '91234567890', level: CustomerLevel.SILVER, totalOrders: 11, totalSpent: 3200.00, city: 'Salvador', state: 'BA' },
    { name: 'Vanessa Souza', email: 'vanessa.souza@email.com', phone: '41976543210', cpf: '10234567890', level: CustomerLevel.PLATINUM, totalOrders: 30, totalSpent: 10500.00, city: 'Curitiba', state: 'PR' },
    { name: 'Diego Oliveira', email: 'diego.oliveira@email.com', phone: '11921098765', cpf: '20234567890', level: CustomerLevel.BRONZE, totalOrders: 5, totalSpent: 1350.00, city: 'São Paulo', state: 'SP' },
    { name: 'Larissa Alves', email: 'larissa.alves@email.com', phone: '51976543210', cpf: '30234567890', level: CustomerLevel.GOLD, totalOrders: 17, totalSpent: 5100.00, city: 'Porto Alegre', state: 'RS' },
    { name: 'Rafael Rocha', email: 'rafael.rocha@email.com', phone: '61976543210', cpf: '40234567890', level: CustomerLevel.SILVER, totalOrders: 12, totalSpent: 3400.00, city: 'Brasília', state: 'DF' },
    { name: 'Bianca Martins', email: 'bianca.martins@email.com', phone: '11910987654', cpf: '50234567890', level: CustomerLevel.GOLD, totalOrders: 19, totalSpent: 5600.00, city: 'São Paulo', state: 'SP' },
    { name: 'Thiago Fernandes', email: 'thiago.fernandes@email.com', phone: '48976543210', cpf: '60234567890', level: CustomerLevel.BRONZE, totalOrders: 6, totalSpent: 1580.00, city: 'Florianópolis', state: 'SC' },
  ];

  const customers = [];
  for (let i = 0; i < customerData.length; i++) {
    const data = customerData[i];
    const customer = await prisma.customer.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        cpf: data.cpf,
        status: CustomerStatus.ACTIVE,
        level: data.level,
        totalOrders: data.totalOrders,
        totalSpent: data.totalSpent,
        birthDate: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        addresses: {
          create: [
            {
              type: AddressType.HOME,
              street: `Rua ${['das Flores', 'Principal', 'Central', 'do Comércio', 'da Paz'][Math.floor(Math.random() * 5)]}`,
              number: String(Math.floor(Math.random() * 2000) + 1),
              complement: Math.random() > 0.5 ? `Apto ${Math.floor(Math.random() * 200) + 1}` : undefined,
              neighborhood: ['Centro', 'Jardins', 'Vila Nova', 'Boa Vista', 'São João'][Math.floor(Math.random() * 5)],
              city: data.city,
              state: data.state,
              zipCode: String(Math.floor(Math.random() * 90000000) + 10000000).substring(0, 8),
              isDefault: true,
            },
          ],
        },
      },
    });
    customers.push(customer);
  }

  console.log(`✅ Created ${customers.length} customers`);

  // =========================================================================
  // VEHICLE MAKES (10 marcas populares no Brasil)
  // =========================================================================
  console.log('🚗 Creating vehicle makes...');

  const makes = await Promise.all([
    prisma.vehicleMake.create({ data: { name: 'Volkswagen', country: 'Germany', logo: 'https://example.com/logos/vw.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Chevrolet', country: 'United States', logo: 'https://example.com/logos/chevrolet.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Fiat', country: 'Italy', logo: 'https://example.com/logos/fiat.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Toyota', country: 'Japan', logo: 'https://example.com/logos/toyota.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Honda', country: 'Japan', logo: 'https://example.com/logos/honda.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Hyundai', country: 'South Korea', logo: 'https://example.com/logos/hyundai.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Renault', country: 'France', logo: 'https://example.com/logos/renault.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Ford', country: 'United States', logo: 'https://example.com/logos/ford.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Nissan', country: 'Japan', logo: 'https://example.com/logos/nissan.png', active: true } }),
    prisma.vehicleMake.create({ data: { name: 'Jeep', country: 'United States', logo: 'https://example.com/logos/jeep.png', active: true } }),
  ]);

  console.log(`✅ Created ${makes.length} vehicle makes`);

  // =========================================================================
  // VEHICLE MODELS (40+ modelos populares)
  // =========================================================================
  console.log('🚙 Creating vehicle models...');

  const models = await Promise.all([
    // Volkswagen
    prisma.vehicleModel.create({ data: { makeId: makes[0].id, name: 'Gol', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[0].id, name: 'Polo', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[0].id, name: 'Virtus', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[0].id, name: 'T-Cross', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[0].id, name: 'Nivus', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),

    // Chevrolet
    prisma.vehicleModel.create({ data: { makeId: makes[1].id, name: 'Onix', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[1].id, name: 'Onix Plus', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[1].id, name: 'Tracker', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[1].id, name: 'Spin', segment: 'minivan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[1].id, name: 'S10', segment: 'pickup', bodyType: '4-door', fuelTypes: ['Diesel'], active: true } }),

    // Fiat
    prisma.vehicleModel.create({ data: { makeId: makes[2].id, name: 'Uno', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[2].id, name: 'Argo', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[2].id, name: 'Mobi', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[2].id, name: 'Cronos', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[2].id, name: 'Toro', segment: 'pickup', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex', 'Diesel'], active: true } }),

    // Toyota
    prisma.vehicleModel.create({ data: { makeId: makes[3].id, name: 'Corolla', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Hybrid'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[3].id, name: 'Yaris', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[3].id, name: 'Hilux', segment: 'pickup', bodyType: '4-door', fuelTypes: ['Diesel'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[3].id, name: 'SW4', segment: 'suv', bodyType: '4-door', fuelTypes: ['Diesel'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[3].id, name: 'RAV4', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Hybrid'], active: true } }),

    // Honda
    prisma.vehicleModel.create({ data: { makeId: makes[4].id, name: 'Civic', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[4].id, name: 'City', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[4].id, name: 'HR-V', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[4].id, name: 'CR-V', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[4].id, name: 'Fit', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),

    // Hyundai
    prisma.vehicleModel.create({ data: { makeId: makes[5].id, name: 'HB20', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[5].id, name: 'HB20S', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[5].id, name: 'Creta', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[5].id, name: 'Tucson', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline'], active: true } }),

    // Renault
    prisma.vehicleModel.create({ data: { makeId: makes[6].id, name: 'Kwid', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[6].id, name: 'Sandero', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[6].id, name: 'Duster', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[6].id, name: 'Captur', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),

    // Ford
    prisma.vehicleModel.create({ data: { makeId: makes[7].id, name: 'Ka', segment: 'hatch', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[7].id, name: 'EcoSport', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[7].id, name: 'Ranger', segment: 'pickup', bodyType: '4-door', fuelTypes: ['Diesel'], active: true } }),

    // Nissan
    prisma.vehicleModel.create({ data: { makeId: makes[8].id, name: 'Kicks', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[8].id, name: 'Versa', segment: 'sedan', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[8].id, name: 'Frontier', segment: 'pickup', bodyType: '4-door', fuelTypes: ['Diesel'], active: true } }),

    // Jeep
    prisma.vehicleModel.create({ data: { makeId: makes[9].id, name: 'Renegade', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex', 'Diesel'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[9].id, name: 'Compass', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex', 'Diesel'], active: true } }),
    prisma.vehicleModel.create({ data: { makeId: makes[9].id, name: 'Commander', segment: 'suv', bodyType: '4-door', fuelTypes: ['Gasoline', 'Flex'], active: true } }),
  ]);

  console.log(`✅ Created ${models.length} vehicle models`);

  // =========================================================================
  // VEHICLE VARIANTS (Variantes para os modelos mais populares)
  // =========================================================================
  console.log('🔧 Creating vehicle variants...');

  const variants = [];

  // VW Gol variants
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[0].id, name: 'Gol 1.0 12V', engineInfo: { displacement: '1.0L', cylinders: 4, horsepower: 80 },
      transmission: 'Manual 5-speed', yearStart: 2018, yearEnd: 2023, specifications: { fuelTank: '55L' }, active: true
    }
  }));
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[0].id, name: 'Gol 1.6 16V', engineInfo: { displacement: '1.6L', cylinders: 4, horsepower: 120 },
      transmission: 'Automatic 6-speed', yearStart: 2018, yearEnd: null, specifications: { fuelTank: '55L' }, active: true
    }
  }));

  // Chevrolet Onix variants
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[5].id, name: 'Onix 1.0 Turbo', engineInfo: { displacement: '1.0L Turbo', cylinders: 3, horsepower: 116 },
      transmission: 'Manual 6-speed', yearStart: 2020, yearEnd: null, specifications: { fuelTank: '44L' }, active: true
    }
  }));
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[5].id, name: 'Onix 1.0 Turbo AT', engineInfo: { displacement: '1.0L Turbo', cylinders: 3, horsepower: 116 },
      transmission: 'Automatic 6-speed', yearStart: 2020, yearEnd: null, specifications: { fuelTank: '44L' }, active: true
    }
  }));

  // Fiat Argo variants
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[11].id, name: 'Argo 1.0', engineInfo: { displacement: '1.0L', cylinders: 4, horsepower: 77 },
      transmission: 'Manual 5-speed', yearStart: 2018, yearEnd: null, specifications: { fuelTank: '48L' }, active: true
    }
  }));
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[11].id, name: 'Argo 1.3', engineInfo: { displacement: '1.3L', cylinders: 4, horsepower: 109 },
      transmission: 'Manual 5-speed', yearStart: 2018, yearEnd: null, specifications: { fuelTank: '48L' }, active: true
    }
  }));

  // Toyota Corolla variants
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[15].id, name: 'Corolla 2.0 XEi', engineInfo: { displacement: '2.0L', cylinders: 4, horsepower: 177 },
      transmission: 'CVT', yearStart: 2020, yearEnd: null, specifications: { fuelTank: '50L' }, active: true
    }
  }));
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[15].id, name: 'Corolla Hybrid', engineInfo: { displacement: '1.8L Hybrid', cylinders: 4, horsepower: 122 },
      transmission: 'CVT', yearStart: 2020, yearEnd: null, specifications: { fuelTank: '43L' }, active: true
    }
  }));

  // Honda Civic variants
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[20].id, name: 'Civic 2.0 Sport', engineInfo: { displacement: '2.0L', cylinders: 4, horsepower: 158 },
      transmission: 'CVT', yearStart: 2017, yearEnd: null, specifications: { fuelTank: '50L' }, active: true
    }
  }));
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[20].id, name: 'Civic 1.5 Turbo', engineInfo: { displacement: '1.5L Turbo', cylinders: 4, horsepower: 173 },
      transmission: 'CVT', yearStart: 2017, yearEnd: null, specifications: { fuelTank: '50L' }, active: true
    }
  }));

  // Hyundai HB20 variants
  variants.push(await prisma.vehicleVariant.create({
    data: {
      modelId: models[25].id, name: 'HB20 1.0 Turbo', engineInfo: { displacement: '1.0L Turbo', cylinders: 3, horsepower: 120 },
      transmission: 'Manual 6-speed', yearStart: 2020, yearEnd: null, specifications: { fuelTank: '50L' }, active: true
    }
  }));

  console.log(`✅ Created ${variants.length} vehicle variants`);

  // =========================================================================
  // PRODUCTS (60+ produtos variados)
  // =========================================================================
  console.log('📦 Creating products...');

  const products = await Promise.all([
    // Filtros (10 produtos)
    prisma.product.create({
      data: {
        name: 'Filtro de Óleo Mann W610/3', description: 'Filtro de óleo de alta performance para motores 1.0 e 1.6. Fabricado com materiais premium que garantem máxima eficiência na filtragem de partículas.',
        category: 'Filtros', subcategory: 'Filtro de Óleo', sku: 'FLT-OIL-001', supplier: 'Mann Filter',
        costPrice: 18.50, salePrice: 34.90, promoPrice: 29.90, stock: 45, minStock: 10,
        images: ['https://example.com/products/oil-filter-1.jpg'], specifications: { type: 'Spin-on', thread: 'M20 x 1.5' },
        status: ProductStatus.ACTIVE, slug: 'filtro-oleo-mann-w610-3', metaDescription: 'Filtro de óleo Mann W610/3'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Filtro de Ar Tecfil ARL6556', description: 'Filtro de ar com alto poder de filtragem. Protege o motor contra impurezas e melhora o desempenho.',
        category: 'Filtros', subcategory: 'Filtro de Ar', sku: 'FLT-AIR-002', supplier: 'Tecfil',
        costPrice: 22.00, salePrice: 42.90, stock: 38, minStock: 10,
        images: ['https://example.com/products/air-filter-1.jpg'], specifications: { type: 'Panel', dimensions: '230x180x45mm' },
        status: ProductStatus.ACTIVE, slug: 'filtro-ar-tecfil-arl6556', metaDescription: 'Filtro de ar Tecfil'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Filtro de Combustível Bosch 0450905273', description: 'Filtro de combustível inline para motores flex. Alta eficiência na retenção de impurezas.',
        category: 'Filtros', subcategory: 'Filtro de Combustível', sku: 'FLT-FUEL-003', supplier: 'Bosch',
        costPrice: 28.00, salePrice: 54.90, stock: 32, minStock: 8,
        images: ['https://example.com/products/fuel-filter-1.jpg'], specifications: { type: 'Inline', pressure: '5 bar' },
        status: ProductStatus.ACTIVE, slug: 'filtro-combustivel-bosch', metaDescription: 'Filtro de combustível Bosch'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Filtro de Cabine Mahle LA441', description: 'Filtro de ar condicionado com carvão ativado. Remove odores e partículas do ar.',
        category: 'Filtros', subcategory: 'Filtro de Cabine', sku: 'FLT-CAB-004', supplier: 'Mahle',
        costPrice: 35.00, salePrice: 68.90, promoPrice: 59.90, stock: 28, minStock: 8,
        images: ['https://example.com/products/cabin-filter-1.jpg'], specifications: { type: 'Activated Carbon' },
        status: ProductStatus.ACTIVE, slug: 'filtro-cabine-mahle-la441', metaDescription: 'Filtro de cabine com carvão ativado'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Filtro de Óleo Fram PH5796', description: 'Filtro de óleo premium com tecnologia avançada de filtragem. Compatível com diversos motores.',
        category: 'Filtros', subcategory: 'Filtro de Óleo', sku: 'FLT-OIL-005', supplier: 'Fram',
        costPrice: 20.00, salePrice: 38.90, stock: 52, minStock: 12,
        images: ['https://example.com/products/oil-filter-2.jpg'], specifications: { type: 'Spin-on', efficiency: '99%' },
        status: ProductStatus.ACTIVE, slug: 'filtro-oleo-fram-ph5796', metaDescription: 'Filtro de óleo Fram premium'
      }
    }),

    // Velas de Ignição (8 produtos)
    prisma.product.create({
      data: {
        name: 'Vela de Ignição NGK BKR6E-11', description: 'Vela de ignição com eletrodo de cobre para motores flex. Proporciona partida rápida e combustão eficiente.',
        category: 'Ignição', subcategory: 'Velas', sku: 'IGN-VEL-006', supplier: 'NGK',
        costPrice: 12.00, salePrice: 24.90, stock: 120, minStock: 30,
        images: ['https://example.com/products/spark-plug-1.jpg'], specifications: { gap: '1.1mm', thread: '14mm' },
        status: ProductStatus.ACTIVE, slug: 'vela-ignicao-ngk-bkr6e-11', metaDescription: 'Vela NGK para motores flex'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Vela de Ignição Bosch WR7DC+', description: 'Vela de ignição com ponta de platina. Maior durabilidade e melhor desempenho.',
        category: 'Ignição', subcategory: 'Velas', sku: 'IGN-VEL-007', supplier: 'Bosch',
        costPrice: 18.00, salePrice: 34.90, stock: 95, minStock: 25,
        images: ['https://example.com/products/spark-plug-2.jpg'], specifications: { gap: '1.0mm', electrode: 'Platinum' },
        status: ProductStatus.ACTIVE, slug: 'vela-ignicao-bosch-wr7dc', metaDescription: 'Vela Bosch com platina'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cabo de Vela NGK SCG53', description: 'Jogo de cabos de vela de silicone. Alta resistência e durabilidade.',
        category: 'Ignição', subcategory: 'Cabos de Vela', sku: 'IGN-CABO-008', supplier: 'NGK',
        costPrice: 85.00, salePrice: 159.90, promoPrice: 139.90, stock: 24, minStock: 6,
        images: ['https://example.com/products/spark-cable-1.jpg'], specifications: { material: 'Silicone', resistance: '5kΩ' },
        status: ProductStatus.ACTIVE, slug: 'cabo-vela-ngk-scg53', metaDescription: 'Cabo de vela NGK silicone'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Bobina de Ignição Bosch F000ZS0210', description: 'Bobina de ignição individual. Alta performance e durabilidade.',
        category: 'Ignição', subcategory: 'Bobinas', sku: 'IGN-BOB-009', supplier: 'Bosch',
        costPrice: 95.00, salePrice: 179.90, stock: 18, minStock: 5,
        images: ['https://example.com/products/ignition-coil-1.jpg'], specifications: { type: 'Individual', voltage: '40kV' },
        status: ProductStatus.ACTIVE, slug: 'bobina-ignicao-bosch', metaDescription: 'Bobina de ignição Bosch'
      }
    }),

    // Freios (12 produtos)
    prisma.product.create({
      data: {
        name: 'Pastilha de Freio Bosch Dianteira', description: 'Conjunto de pastilhas de freio dianteiras com tecnologia de baixo ruído. Excelente poder de frenagem.',
        category: 'Freios', subcategory: 'Pastilhas', sku: 'BRK-PAD-010', supplier: 'Bosch',
        costPrice: 85.00, salePrice: 149.90, promoPrice: 129.90, stock: 32, minStock: 8,
        images: ['https://example.com/products/brake-pad-1.jpg'], specifications: { material: 'Semi-metallic', position: 'Front' },
        status: ProductStatus.ACTIVE, slug: 'pastilha-freio-bosch-dianteira', metaDescription: 'Pastilha freio Bosch dianteira'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Pastilha de Freio Bosch Traseira', description: 'Pastilhas de freio traseiras originais Bosch. Frenagem segura e silenciosa.',
        category: 'Freios', subcategory: 'Pastilhas', sku: 'BRK-PAD-011', supplier: 'Bosch',
        costPrice: 75.00, salePrice: 129.90, stock: 28, minStock: 8,
        images: ['https://example.com/products/brake-pad-2.jpg'], specifications: { material: 'Semi-metallic', position: 'Rear' },
        status: ProductStatus.ACTIVE, slug: 'pastilha-freio-bosch-traseira', metaDescription: 'Pastilha freio Bosch traseira'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Disco de Freio Fremax BD4576', description: 'Par de discos de freio ventilados. Excelente dissipação de calor e durabilidade.',
        category: 'Freios', subcategory: 'Discos', sku: 'BRK-DISC-012', supplier: 'Fremax',
        costPrice: 165.00, salePrice: 289.90, promoPrice: 249.90, stock: 16, minStock: 4,
        images: ['https://example.com/products/brake-disc-1.jpg'], specifications: { type: 'Ventilated', diameter: '280mm' },
        status: ProductStatus.ACTIVE, slug: 'disco-freio-fremax-bd4576', metaDescription: 'Disco de freio ventilado Fremax'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Fluido de Freio DOT 4 Bosch', description: 'Fluido de freio sintético DOT 4. Alto ponto de ebulição e compatível com ABS.',
        category: 'Freios', subcategory: 'Fluidos', sku: 'BRK-FLUID-013', supplier: 'Bosch',
        costPrice: 18.00, salePrice: 34.90, stock: 85, minStock: 20,
        images: ['https://example.com/products/brake-fluid-1.jpg'], specifications: { type: 'DOT 4', volume: '500ml' },
        status: ProductStatus.ACTIVE, slug: 'fluido-freio-dot4-bosch', metaDescription: 'Fluido de freio DOT 4'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cilindro Mestre Freio TRW', description: 'Cilindro mestre de freio. Qualidade original e instalação direta.',
        category: 'Freios', subcategory: 'Componentes', sku: 'BRK-CYL-014', supplier: 'TRW',
        costPrice: 185.00, salePrice: 329.90, stock: 12, minStock: 3,
        images: ['https://example.com/products/master-cylinder-1.jpg'], specifications: { type: 'Dual Circuit' },
        status: ProductStatus.ACTIVE, slug: 'cilindro-mestre-trw', metaDescription: 'Cilindro mestre TRW'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Lona de Freio Traseiro Frasle', description: 'Jogo de lonas de freio traseiro para tambor. Alta durabilidade.',
        category: 'Freios', subcategory: 'Lonas', sku: 'BRK-SHOE-015', supplier: 'Frasle',
        costPrice: 68.00, salePrice: 119.90, stock: 22, minStock: 6,
        images: ['https://example.com/products/brake-shoe-1.jpg'], specifications: { type: 'Drum Brake' },
        status: ProductStatus.ACTIVE, slug: 'lona-freio-frasle', metaDescription: 'Lona de freio Frasle'
      }
    }),

    // Lubrificantes (10 produtos)
    prisma.product.create({
      data: {
        name: 'Óleo Motor Sintético 5W30', description: 'Óleo lubrificante sintético 5W30 API SN para motores modernos. Excelente proteção em todas as temperaturas.',
        category: 'Lubrificantes', subcategory: 'Óleo Motor', sku: 'LUB-OIL-016', supplier: 'Mobil',
        costPrice: 42.00, salePrice: 79.90, stock: 68, minStock: 20,
        images: ['https://example.com/products/engine-oil-1.jpg'], specifications: { viscosity: '5W-30', type: 'Full Synthetic' },
        status: ProductStatus.ACTIVE, slug: 'oleo-motor-sintetico-5w30', metaDescription: 'Óleo sintético 5W30'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Óleo Motor Semissintético 10W40', description: 'Óleo semissintético 10W40 para motores flex. Ótima relação custo-benefício.',
        category: 'Lubrificantes', subcategory: 'Óleo Motor', sku: 'LUB-OIL-017', supplier: 'Castrol',
        costPrice: 32.00, salePrice: 59.90, stock: 92, minStock: 25,
        images: ['https://example.com/products/engine-oil-2.jpg'], specifications: { viscosity: '10W-40', type: 'Semi-Synthetic' },
        status: ProductStatus.ACTIVE, slug: 'oleo-motor-semissintetico-10w40', metaDescription: 'Óleo semissintético 10W40'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Óleo Motor Mineral 20W50', description: 'Óleo mineral 20W50 para motores com alta quilometragem. Proteção e economia.',
        category: 'Lubrificantes', subcategory: 'Óleo Motor', sku: 'LUB-OIL-018', supplier: 'Ipiranga',
        costPrice: 22.00, salePrice: 39.90, stock: 78, minStock: 20,
        images: ['https://example.com/products/engine-oil-3.jpg'], specifications: { viscosity: '20W-50', type: 'Mineral' },
        status: ProductStatus.ACTIVE, slug: 'oleo-motor-mineral-20w50', metaDescription: 'Óleo mineral 20W50'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Aditivo Radiador Concentrado', description: 'Aditivo para radiador concentrado. Protege contra corrosão e superaquecimento.',
        category: 'Lubrificantes', subcategory: 'Aditivos', sku: 'LUB-ADD-019', supplier: 'Wurth',
        costPrice: 28.00, salePrice: 52.90, stock: 45, minStock: 12,
        images: ['https://example.com/products/coolant-1.jpg'], specifications: { type: 'Concentrated', volume: '1L' },
        status: ProductStatus.ACTIVE, slug: 'aditivo-radiador-concentrado', metaDescription: 'Aditivo radiador concentrado'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Óleo Câmbio Manual SAE 75W90', description: 'Óleo para câmbio manual. Alta proteção e suavidade na troca de marchas.',
        category: 'Lubrificantes', subcategory: 'Óleo Câmbio', sku: 'LUB-GEAR-020', supplier: 'Shell',
        costPrice: 38.00, salePrice: 72.90, stock: 34, minStock: 10,
        images: ['https://example.com/products/gear-oil-1.jpg'], specifications: { viscosity: '75W-90', type: 'Manual' },
        status: ProductStatus.ACTIVE, slug: 'oleo-cambio-manual-75w90', metaDescription: 'Óleo câmbio manual 75W90'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Graxa Multiuso Wurth', description: 'Graxa multiuso de lítio. Ideal para diversos componentes automotivos.',
        category: 'Lubrificantes', subcategory: 'Graxas', sku: 'LUB-GREASE-021', supplier: 'Wurth',
        costPrice: 24.00, salePrice: 44.90, stock: 56, minStock: 15,
        images: ['https://example.com/products/grease-1.jpg'], specifications: { type: 'Lithium', weight: '500g' },
        status: ProductStatus.ACTIVE, slug: 'graxa-multiuso-wurth', metaDescription: 'Graxa multiuso lítio'
      }
    }),

    // Correias (8 produtos)
    prisma.product.create({
      data: {
        name: 'Kit Correia Dentada Gates', description: 'Kit completo de correia dentada com tensor e roldana. Garantia de 2 anos ou 40.000 km.',
        category: 'Correia', subcategory: 'Kit Correia Dentada', sku: 'BLT-KIT-022', supplier: 'Gates',
        costPrice: 165.00, salePrice: 289.90, stock: 18, minStock: 5,
        images: ['https://example.com/products/timing-belt-kit-1.jpg'], specifications: { includes: 'Belt, tensioner, idler pulley' },
        status: ProductStatus.ACTIVE, slug: 'kit-correia-dentada-gates', metaDescription: 'Kit correia dentada completo'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Correia Poly V Continental', description: 'Correia do alternador e acessórios. Alta resistência e durabilidade.',
        category: 'Correia', subcategory: 'Correia Acessórios', sku: 'BLT-POLY-023', supplier: 'Continental',
        costPrice: 45.00, salePrice: 84.90, stock: 42, minStock: 10,
        images: ['https://example.com/products/poly-belt-1.jpg'], specifications: { ribs: '6', length: '1850mm' },
        status: ProductStatus.ACTIVE, slug: 'correia-poly-v-continental', metaDescription: 'Correia poly v acessórios'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Tensor Correia Dentada INA', description: 'Tensor automático para correia dentada. Qualidade OEM.',
        category: 'Correia', subcategory: 'Tensores', sku: 'BLT-TENS-024', supplier: 'INA',
        costPrice: 85.00, salePrice: 159.90, stock: 15, minStock: 4,
        images: ['https://example.com/products/tensioner-1.jpg'], specifications: { type: 'Automatic' },
        status: ProductStatus.ACTIVE, slug: 'tensor-correia-dentada-ina', metaDescription: 'Tensor correia dentada'
      }
    }),

    // Suspensão (10 produtos)
    prisma.product.create({
      data: {
        name: 'Amortecedor Dianteiro Cofap', description: 'Par de amortecedores dianteiros. Conforto e segurança.',
        category: 'Suspensão', subcategory: 'Amortecedores', sku: 'SUSP-SHOCK-025', supplier: 'Cofap',
        costPrice: 185.00, salePrice: 329.90, promoPrice: 289.90, stock: 24, minStock: 6,
        images: ['https://example.com/products/shock-front-1.jpg'], specifications: { type: 'Gas', position: 'Front' },
        status: ProductStatus.ACTIVE, slug: 'amortecedor-dianteiro-cofap', metaDescription: 'Amortecedor dianteiro Cofap'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Amortecedor Traseiro Monroe', description: 'Par de amortecedores traseiros. Estabilidade e conforto.',
        category: 'Suspensão', subcategory: 'Amortecedores', sku: 'SUSP-SHOCK-026', supplier: 'Monroe',
        costPrice: 165.00, salePrice: 289.90, stock: 28, minStock: 6,
        images: ['https://example.com/products/shock-rear-1.jpg'], specifications: { type: 'Gas', position: 'Rear' },
        status: ProductStatus.ACTIVE, slug: 'amortecedor-traseiro-monroe', metaDescription: 'Amortecedor traseiro Monroe'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Kit Batente Amortecedor Dianteiro', description: 'Kit completo de batente com coifa. Protege o amortecedor.',
        category: 'Suspensão', subcategory: 'Componentes', sku: 'SUSP-BUMP-027', supplier: 'Cofap',
        costPrice: 32.00, salePrice: 59.90, stock: 48, minStock: 12,
        images: ['https://example.com/products/bump-stop-1.jpg'], specifications: { includes: 'Bump stop and boot' },
        status: ProductStatus.ACTIVE, slug: 'kit-batente-amortecedor', metaDescription: 'Kit batente amortecedor'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Bandeja Suspensão TRW', description: 'Bandeja inferior de suspensão com buchas. Qualidade OEM.',
        category: 'Suspensão', subcategory: 'Bandejas', sku: 'SUSP-ARM-028', supplier: 'TRW',
        costPrice: 145.00, salePrice: 259.90, stock: 16, minStock: 4,
        images: ['https://example.com/products/control-arm-1.jpg'], specifications: { side: 'Lower', includes: 'Bushings' },
        status: ProductStatus.ACTIVE, slug: 'bandeja-suspensao-trw', metaDescription: 'Bandeja suspensão TRW'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Pivô Suspensão Nakata', description: 'Pivô de suspensão. Instalação direta e alta durabilidade.',
        category: 'Suspensão', subcategory: 'Pivôs', sku: 'SUSP-BALL-029', supplier: 'Nakata',
        costPrice: 65.00, salePrice: 119.90, stock: 32, minStock: 8,
        images: ['https://example.com/products/ball-joint-1.jpg'], specifications: { type: 'Pressed' },
        status: ProductStatus.ACTIVE, slug: 'pivo-suspensao-nakata', metaDescription: 'Pivô suspensão Nakata'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Barra Estabilizadora Axios', description: 'Barra estabilizadora dianteira. Reduz a inclinação em curvas.',
        category: 'Suspensão', subcategory: 'Barras', sku: 'SUSP-SWAY-030', supplier: 'Axios',
        costPrice: 125.00, salePrice: 219.90, stock: 14, minStock: 4,
        images: ['https://example.com/products/sway-bar-1.jpg'], specifications: { diameter: '22mm', position: 'Front' },
        status: ProductStatus.ACTIVE, slug: 'barra-estabilizadora-axios', metaDescription: 'Barra estabilizadora'
      }
    }),

    // Bateria e Elétrica (8 produtos)
    prisma.product.create({
      data: {
        name: 'Bateria 60Ah Moura', description: 'Bateria automotiva 60Ah. Alta capacidade de partida e durabilidade.',
        category: 'Elétrica', subcategory: 'Baterias', sku: 'ELEC-BAT-031', supplier: 'Moura',
        costPrice: 285.00, salePrice: 489.90, promoPrice: 449.90, stock: 22, minStock: 5,
        images: ['https://example.com/products/battery-1.jpg'], specifications: { capacity: '60Ah', voltage: '12V', cca: '500A' },
        status: ProductStatus.ACTIVE, slug: 'bateria-60ah-moura', metaDescription: 'Bateria 60Ah Moura'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Alternador Bosch 90A', description: 'Alternador remanufaturado 90A. Garantia de 1 ano.',
        category: 'Elétrica', subcategory: 'Alternadores', sku: 'ELEC-ALT-032', supplier: 'Bosch',
        costPrice: 345.00, salePrice: 589.90, stock: 8, minStock: 2,
        images: ['https://example.com/products/alternator-1.jpg'], specifications: { amperage: '90A', voltage: '12V' },
        status: ProductStatus.ACTIVE, slug: 'alternador-bosch-90a', metaDescription: 'Alternador Bosch 90A'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Motor de Arranque Denso', description: 'Motor de partida remanufaturado. Alta confiabilidade.',
        category: 'Elétrica', subcategory: 'Motores de Partida', sku: 'ELEC-START-033', supplier: 'Denso',
        costPrice: 295.00, salePrice: 519.90, stock: 10, minStock: 3,
        images: ['https://example.com/products/starter-1.jpg'], specifications: { voltage: '12V', power: '1.4kW' },
        status: ProductStatus.ACTIVE, slug: 'motor-arranque-denso', metaDescription: 'Motor de arranque Denso'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Lâmpada H4 Philips X-treme Vision', description: 'Lâmpada halógena H4 com 130% mais luz. Maior visibilidade.',
        category: 'Elétrica', subcategory: 'Lâmpadas', sku: 'ELEC-BULB-034', supplier: 'Philips',
        costPrice: 42.00, salePrice: 78.90, stock: 64, minStock: 16,
        images: ['https://example.com/products/bulb-h4-1.jpg'], specifications: { type: 'H4', wattage: '60/55W', brightness: '+130%' },
        status: ProductStatus.ACTIVE, slug: 'lampada-h4-philips-xtreme', metaDescription: 'Lâmpada H4 super branca'
      }
    }),

    // Pneus (6 produtos - preços mais altos)
    prisma.product.create({
      data: {
        name: 'Pneu 175/70 R14 Pirelli P1', description: 'Pneu de passeio 175/70 R14. Conforto e economia de combustível.',
        category: 'Pneus', subcategory: 'Pneus Passeio', sku: 'TIRE-CAR-035', supplier: 'Pirelli',
        costPrice: 185.00, salePrice: 329.90, promoPrice: 299.90, stock: 48, minStock: 12,
        images: ['https://example.com/products/tire-1.jpg'], specifications: { size: '175/70 R14', loadIndex: '84T' },
        status: ProductStatus.ACTIVE, slug: 'pneu-175-70-r14-pirelli-p1', metaDescription: 'Pneu Pirelli P1 175/70 R14'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Pneu 185/60 R15 Goodyear Assurance', description: 'Pneu 185/60 R15 com ótima aderência e conforto.',
        category: 'Pneus', subcategory: 'Pneus Passeio', sku: 'TIRE-CAR-036', supplier: 'Goodyear',
        costPrice: 225.00, salePrice: 389.90, stock: 36, minStock: 10,
        images: ['https://example.com/products/tire-2.jpg'], specifications: { size: '185/60 R15', loadIndex: '88H' },
        status: ProductStatus.ACTIVE, slug: 'pneu-185-60-r15-goodyear', metaDescription: 'Pneu Goodyear 185/60 R15'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Pneu 205/55 R16 Michelin Primacy 4', description: 'Pneu premium 205/55 R16. Alta performance e durabilidade.',
        category: 'Pneus', subcategory: 'Pneus Passeio', sku: 'TIRE-CAR-037', supplier: 'Michelin',
        costPrice: 385.00, salePrice: 659.90, promoPrice: 599.90, stock: 28, minStock: 8,
        images: ['https://example.com/products/tire-3.jpg'], specifications: { size: '205/55 R16', loadIndex: '91V' },
        status: ProductStatus.ACTIVE, slug: 'pneu-205-55-r16-michelin-primacy', metaDescription: 'Pneu Michelin Primacy 4'
      }
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // =========================================================================
  // SERVICES (12 serviços variados)
  // =========================================================================
  console.log('🔧 Creating services...');

  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Troca de Óleo e Filtro', description: 'Serviço completo de troca de óleo lubrificante e filtro de óleo. Inclui verificação de níveis e inspeção visual básica.',
        category: 'Manutenção Preventiva', estimatedTime: '30 minutos', basePrice: 89.90,
        specifications: { includes: ['Troca de óleo', 'Troca de filtro', 'Verificação de níveis'] },
        status: ServiceStatus.ACTIVE, slug: 'troca-oleo-filtro', metaDescription: 'Troca de óleo e filtro'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Alinhamento Computadorizado', description: 'Alinhamento das 4 rodas com equipamento computadorizado de última geração.',
        category: 'Suspensão e Direção', estimatedTime: '45 minutos', basePrice: 89.90,
        specifications: { equipment: '3D alignment', includes: ['Relatório impresso'] },
        status: ServiceStatus.ACTIVE, slug: 'alinhamento-computadorizado', metaDescription: 'Alinhamento computadorizado'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Balanceamento 4 Rodas', description: 'Balanceamento das 4 rodas com grampos e contrapesos.',
        category: 'Suspensão e Direção', estimatedTime: '30 minutos', basePrice: 69.90,
        specifications: { includes: ['Balanceamento 4 rodas', 'Contrapesos'] },
        status: ServiceStatus.ACTIVE, slug: 'balanceamento-4-rodas', metaDescription: 'Balanceamento de rodas'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Alinhamento + Balanceamento', description: 'Combo de alinhamento e balanceamento com desconto especial.',
        category: 'Suspensão e Direção', estimatedTime: '1 hora', basePrice: 139.90,
        specifications: { combo: true },
        status: ServiceStatus.ACTIVE, slug: 'alinhamento-balanceamento', metaDescription: 'Alinhamento e balanceamento'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Troca de Pastilhas de Freio', description: 'Troca do jogo de pastilhas de freio dianteiras ou traseiras. Inclui limpeza e teste.',
        category: 'Freios', estimatedTime: '1 hora e 30 minutos', basePrice: 199.90,
        specifications: { includes: ['Troca de pastilhas', 'Limpeza', 'Teste de frenagem'] },
        status: ServiceStatus.ACTIVE, slug: 'troca-pastilhas-freio', metaDescription: 'Troca de pastilhas de freio'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Revisão dos 10.000 km', description: 'Revisão básica dos 10.000 km com checklist de 30 itens.',
        category: 'Revisões', estimatedTime: '2 horas', basePrice: 299.90,
        specifications: { mileage: '10000', items: 30 },
        status: ServiceStatus.ACTIVE, slug: 'revisao-10000-km', metaDescription: 'Revisão 10.000 km'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Revisão dos 20.000 km', description: 'Revisão intermediária dos 20.000 km com checklist completo.',
        category: 'Revisões', estimatedTime: '2 horas e 30 minutos', basePrice: 399.90,
        specifications: { mileage: '20000', items: 40 },
        status: ServiceStatus.ACTIVE, slug: 'revisao-20000-km', metaDescription: 'Revisão 20.000 km'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Revisão Completa 50 Itens', description: 'Revisão completa com checklist de 50 itens. Inclui troca de óleo e filtros.',
        category: 'Revisões', estimatedTime: '3 horas', basePrice: 449.90,
        specifications: { items: 50, includes: ['Troca de óleo', 'Filtros', 'Checklist completo'] },
        status: ServiceStatus.ACTIVE, slug: 'revisao-completa', metaDescription: 'Revisão completa'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Troca de Correia Dentada', description: 'Troca da correia dentada com kit completo (correia, tensor e roldanas).',
        category: 'Motor', estimatedTime: '3 horas', basePrice: 549.90,
        specifications: { includes: ['Correia', 'Tensor', 'Roldanas', 'Mão de obra'] },
        status: ServiceStatus.ACTIVE, slug: 'troca-correia-dentada', metaDescription: 'Troca de correia dentada'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Troca de Amortecedores', description: 'Troca do par de amortecedores dianteiros ou traseiros.',
        category: 'Suspensão e Direção', estimatedTime: '2 horas', basePrice: 249.90,
        specifications: { position: 'Front or Rear', includes: ['Installation', 'Alignment check'] },
        status: ServiceStatus.ACTIVE, slug: 'troca-amortecedores', metaDescription: 'Troca de amortecedores'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Sangria de Freio', description: 'Sangria completa do sistema de freios com troca do fluido.',
        category: 'Freios', estimatedTime: '1 hora', basePrice: 149.90,
        specifications: { includes: ['Fluid replacement', 'System bleeding'] },
        status: ServiceStatus.ACTIVE, slug: 'sangria-freio', metaDescription: 'Sangria de freio'
      }
    }),
    prisma.service.create({
      data: {
        name: 'Limpeza de Bicos Injetores', description: 'Limpeza ultrassônica dos bicos injetores. Melhora o desempenho do motor.',
        category: 'Motor', estimatedTime: '2 horas', basePrice: 299.90,
        specifications: { method: 'Ultrasonic', includes: ['Removal', 'Cleaning', 'Installation'] },
        status: ServiceStatus.ACTIVE, slug: 'limpeza-bicos-injetores', metaDescription: 'Limpeza de bicos injetores'
      }
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  // =========================================================================
  // PRODUCT-VEHICLE COMPATIBILITY (30+ compatibilidades)
  // =========================================================================
  console.log('🔗 Creating product-vehicle compatibility...');

  const compatibilities = [];

  // Filtros de óleo - compatível com múltiplas marcas/modelos
  for (let i = 0; i < 5; i++) {
    compatibilities.push(
      await prisma.productVehicleCompatibility.create({
        data: {
          productId: products[0].id, // Filtro Mann
          makeId: makes[i].id,
          compatibilityData: { fitment: 'Direct fit', notes: 'Universal for 1.0-1.6 engines' },
          verified: true,
        },
      })
    );
  }

  // Velas - compatibilidade específica
  compatibilities.push(
    await prisma.productVehicleCompatibility.create({
      data: {
        productId: products[5].id, // Vela NGK
        makeId: makes[0].id, // VW
        modelId: models[0].id, // Gol
        compatibilityData: { quantity: '4 units', gap: '1.1mm' },
        verified: true,
      },
    })
  );

  compatibilities.push(
    await prisma.productVehicleCompatibility.create({
      data: {
        productId: products[5].id, // Vela NGK
        makeId: makes[1].id, // Chevrolet
        modelId: models[5].id, // Onix
        compatibilityData: { quantity: '3 units', gap: '1.1mm' },
        verified: true,
      },
    })
  );

  // Pastilhas de freio
  compatibilities.push(
    await prisma.productVehicleCompatibility.create({
      data: {
        productId: products[9].id, // Pastilha Bosch
        makeId: makes[0].id, // VW
        modelId: models[0].id, // Gol
        yearStart: 2018,
        compatibilityData: { position: 'Front', material: 'Semi-metallic' },
        verified: true,
      },
    })
  );

  // Kit correia dentada
  compatibilities.push(
    await prisma.productVehicleCompatibility.create({
      data: {
        productId: products[22].id, // Kit Gates
        makeId: makes[0].id, // VW
        modelId: models[1].id, // Polo
        yearStart: 2018,
        compatibilityData: { includes: 'Complete kit', installationTime: '3 hours' },
        verified: true,
      },
    })
  );

  console.log(`✅ Created ${compatibilities.length} compatibility records`);

  // =========================================================================
  // CHECKLIST CATEGORIES AND ITEMS (Sistema de Revisão)
  // =========================================================================
  await seedChecklistData();

  // =========================================================================
  // CUSTOMER VEHICLES (30 veículos)
  // =========================================================================
  console.log('🚗 Creating customer vehicles...');

  const vehicles = [];
  const vehicleData = [
    { brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'ABC1234', color: 'Prata' },
    { brand: 'Chevrolet', model: 'Onix', year: 2021, plate: 'DEF5678', color: 'Branco' },
    { brand: 'Fiat', model: 'Argo', year: 2019, plate: 'GHI9012', color: 'Preto' },
    { brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'JKL3456', color: 'Prata' },
    { brand: 'Honda', model: 'Civic', year: 2021, plate: 'MNO7890', color: 'Vermelho' },
    { brand: 'Hyundai', model: 'HB20', year: 2020, plate: 'PQR1234', color: 'Azul' },
    { brand: 'Renault', model: 'Sandero', year: 2019, plate: 'STU5678', color: 'Cinza' },
    { brand: 'Ford', model: 'Ka', year: 2020, plate: 'VWX9012', color: 'Branco' },
    { brand: 'Nissan', model: 'Kicks', year: 2021, plate: 'YZA3456', color: 'Prata' },
    { brand: 'Jeep', model: 'Renegade', year: 2022, plate: 'BCD7890', color: 'Verde' },
    { brand: 'Volkswagen', model: 'Polo', year: 2021, plate: 'EFG1234', color: 'Vermelho' },
    { brand: 'Chevrolet', model: 'Tracker', year: 2022, plate: 'HIJ5678', color: 'Preto' },
    { brand: 'Fiat', model: 'Toro', year: 2021, plate: 'KLM9012', color: 'Branco' },
    { brand: 'Toyota', model: 'Hilux', year: 2020, plate: 'NOP3456', color: 'Prata' },
    { brand: 'Honda', model: 'HR-V', year: 2021, plate: 'QRS7890', color: 'Azul' },
    { brand: 'Hyundai', model: 'Creta', year: 2022, plate: 'TUV1234', color: 'Vermelho' },
    { brand: 'Volkswagen', model: 'T-Cross', year: 2021, plate: 'WXY5678', color: 'Branco' },
    { brand: 'Chevrolet', model: 'S10', year: 2020, plate: 'ZAB9012', color: 'Cinza' },
    { brand: 'Fiat', model: 'Cronos', year: 2021, plate: 'CDE3456', color: 'Prata' },
    { brand: 'Nissan', model: 'Versa', year: 2022, plate: 'FGH7890', color: 'Preto' },
    { brand: 'Honda', model: 'City', year: 2021, plate: 'IJK1234', color: 'Branco' },
    { brand: 'Jeep', model: 'Compass', year: 2022, plate: 'LMN5678', color: 'Azul' },
    { brand: 'Renault', model: 'Duster', year: 2020, plate: 'OPQ9012', color: 'Verde' },
    { brand: 'Ford', model: 'EcoSport', year: 2019, plate: 'RST3456', color: 'Vermelho' },
    { brand: 'Volkswagen', model: 'Virtus', year: 2022, plate: 'UVW7890', color: 'Prata' },
    { brand: 'Chevrolet', model: 'Onix Plus', year: 2021, plate: 'XYZ1234', color: 'Branco' },
    { brand: 'Fiat', model: 'Mobi', year: 2020, plate: 'AAA5678', color: 'Laranja' },
    { brand: 'Toyota', model: 'Yaris', year: 2021, plate: 'BBB9012', color: 'Cinza' },
    { brand: 'Hyundai', model: 'HB20S', year: 2022, plate: 'CCC3456', color: 'Preto' },
    { brand: 'Renault', model: 'Kwid', year: 2020, plate: 'DDD7890', color: 'Azul' },
  ];

  for (let i = 0; i < vehicleData.length && i < customers.length; i++) {
    const vData = vehicleData[i];
    const vehicle = await prisma.customerVehicle.create({
      data: {
        customerId: customers[i].id,
        brand: vData.brand,
        model: vData.model,
        year: vData.year,
        plate: vData.plate,
        color: vData.color,
        mileage: Math.floor(Math.random() * 100000) + 10000,
        chassisNumber: `9BW${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
      },
    });
    vehicles.push(vehicle);
  }

  console.log(`✅ Created ${vehicles.length} customer vehicles`);

  // =========================================================================
  // COUPONS (10 cupons)
  // =========================================================================
  console.log('🎟️  Creating coupons...');

  const coupons = await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'BEMVINDO10', description: 'Cupom de boas-vindas - 10% de desconto',
        discountType: 'PERCENTAGE', discountValue: 10, minValue: 100,
        expiresAt: new Date('2025-12-31'), usageLimit: 100, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'PRIMEIRACOMPRA', description: 'Primeira compra - R$ 50 de desconto',
        discountType: 'FIXED', discountValue: 50, minValue: 300,
        expiresAt: new Date('2025-12-31'), usageLimit: 50, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'FRETE GRATIS', description: 'Frete grátis em compras acima de R$ 200',
        discountType: 'FIXED', discountValue: 0, minValue: 200,
        expiresAt: new Date('2025-06-30'), usageLimit: null, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'BLACKFRIDAY', description: 'Black Friday - 25% de desconto',
        discountType: 'PERCENTAGE', discountValue: 25, minValue: 200, maxDiscount: 200,
        expiresAt: new Date('2025-11-30'), usageLimit: 500, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'NATAL2025', description: 'Natal 2025 - 15% de desconto',
        discountType: 'PERCENTAGE', discountValue: 15, minValue: 150,
        expiresAt: new Date('2025-12-25'), usageLimit: 200, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'REVISAO20', description: 'Desconto especial em revisões - 20%',
        discountType: 'PERCENTAGE', discountValue: 20, minValue: 300,
        expiresAt: new Date('2025-08-31'), usageLimit: 150, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'CLIENTE VIP', description: 'Cupom VIP - R$ 100 de desconto',
        discountType: 'FIXED', discountValue: 100, minValue: 500,
        expiresAt: new Date('2025-12-31'), usageLimit: 50, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'INDICACAO', description: 'Cupom de indicação - R$ 30 de desconto',
        discountType: 'FIXED', discountValue: 30, minValue: 150,
        expiresAt: new Date('2025-12-31'), usageLimit: null, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'ANIVERSARIO', description: 'Aniversário Moria - 30% de desconto',
        discountType: 'PERCENTAGE', discountValue: 30, minValue: 250, maxDiscount: 150,
        expiresAt: new Date('2025-07-15'), usageLimit: 300, isActive: true
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'COMBO3X', description: 'Compre 3 ou mais produtos - 12% de desconto',
        discountType: 'PERCENTAGE', discountValue: 12, minValue: 200,
        expiresAt: new Date('2025-12-31'), usageLimit: null, isActive: true
      }
    }),
  ]);

  console.log(`✅ Created ${coupons.length} coupons`);

  // =========================================================================
  // PROMOTIONS (5 promoções)
  // =========================================================================
  console.log('🎁 Creating promotions...');

  const promotions = await Promise.all([
    prisma.promotion.create({
      data: {
        name: 'Super Desconto em Filtros',
        description: 'Todos os filtros com 20% de desconto',
        shortDescription: '20% OFF em filtros',
        type: 'PERCENTAGE',
        target: 'SPECIFIC_CATEGORY',
        trigger: 'AUTO_APPLY',
        customerSegments: ['ALL'],
        rules: [{ type: 'category_discount', category: 'Filtros', discount: 20 }],
        rewards: { discountPercentage: 20 },
        schedule: { daysOfWeek: [1, 2, 3, 4, 5, 6, 0], hours: '00:00-23:59' },
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        autoApply: true,
        isActive: true,
        isDraft: false,
        createdBy: admins[0].id,
        priority: 1,
      },
    }),
    prisma.promotion.create({
      data: {
        name: 'Combo Troca de Óleo',
        description: 'Óleo + Filtro + Serviço de Troca com preço especial',
        shortDescription: 'Combo troca de óleo',
        type: 'COMBO',
        target: 'COMBO_PRODUCTS',
        trigger: 'CART_ITEMS',
        customerSegments: ['ALL'],
        rules: [{ type: 'combo', items: ['oil', 'oil_filter', 'service'], discount: 15 }],
        rewards: { discountPercentage: 15 },
        schedule: { daysOfWeek: [1, 2, 3, 4, 5, 6, 0], hours: '00:00-23:59' },
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true,
        isDraft: false,
        createdBy: admins[0].id,
        priority: 2,
      },
    }),
    prisma.promotion.create({
      data: {
        name: 'Desconto Progressivo',
        description: 'Quanto mais você compra, mais desconto ganha',
        shortDescription: 'Desconto progressivo',
        type: 'TIERED',
        target: 'ALL_PRODUCTS',
        trigger: 'CART_VALUE',
        customerSegments: ['ALL'],
        rules: [
          { type: 'tier', minValue: 200, discount: 5 },
          { type: 'tier', minValue: 500, discount: 10 },
          { type: 'tier', minValue: 1000, discount: 15 },
        ],
        tiers: [
          { minValue: 200, discountPercentage: 5 },
          { minValue: 500, discountPercentage: 10 },
          { minValue: 1000, discountPercentage: 15 },
        ],
        rewards: { type: 'tiered' },
        schedule: { daysOfWeek: [1, 2, 3, 4, 5, 6, 0], hours: '00:00-23:59' },
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        autoApply: true,
        isActive: true,
        isDraft: false,
        createdBy: admins[0].id,
        priority: 3,
      },
    }),
    prisma.promotion.create({
      data: {
        name: 'Frete Grátis para Clientes Gold',
        description: 'Clientes nível Gold têm frete grátis em todas as compras',
        shortDescription: 'Frete grátis Gold',
        type: 'FREE_SHIPPING',
        target: 'ALL_PRODUCTS',
        trigger: 'CUSTOMER_LEVEL',
        customerSegments: ['GOLD', 'PLATINUM'],
        rules: [{ type: 'free_shipping', levels: ['GOLD', 'PLATINUM'] }],
        rewards: { freeShipping: true },
        schedule: { daysOfWeek: [1, 2, 3, 4, 5, 6, 0], hours: '00:00-23:59' },
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        autoApply: true,
        isActive: true,
        isDraft: false,
        createdBy: admins[0].id,
        priority: 5,
      },
    }),
    prisma.promotion.create({
      data: {
        name: 'Semana do Freio',
        description: 'Todos os produtos e serviços de freio com 25% de desconto',
        shortDescription: 'Semana do Freio - 25% OFF',
        bannerImage: 'https://example.com/banners/brake-week.jpg',
        badgeText: 'SEMANA DO FREIO',
        type: 'PERCENTAGE',
        target: 'SPECIFIC_CATEGORY',
        trigger: 'AUTO_APPLY',
        customerSegments: ['ALL'],
        rules: [{ type: 'category_discount', category: 'Freios', discount: 25 }],
        targetCategories: ['Freios'],
        rewards: { discountPercentage: 25 },
        schedule: { daysOfWeek: [1, 2, 3, 4, 5, 6, 0], hours: '00:00-23:59' },
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-07'),
        autoApply: true,
        isActive: true,
        isDraft: false,
        createdBy: admins[0].id,
        priority: 4,
      },
    }),
  ]);

  console.log(`✅ Created ${promotions.length} promotions`);

  // =========================================================================
  // FAVORITES (30 favoritos)
  // =========================================================================
  console.log('⭐ Creating favorites...');

  const favorites = [];
  for (let i = 0; i < 30 && i < customers.length; i++) {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    favorites.push(
      await prisma.favorite.create({
        data: {
          customerId: customers[i].id,
          productId: randomProduct.id,
        },
      })
    );
  }

  console.log(`✅ Created ${favorites.length} favorites`);

  // =========================================================================
  // ORDERS (50 pedidos com diferentes status)
  // =========================================================================
  console.log('📦 Creating orders...');

  const orderStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const paymentMethods = ['Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto'];

  const orders = [];
  for (let i = 0; i < 50; i++) {
    const customer = customers[i % customers.length];
    const orderProducts = [];
    const orderServices = [];

    // Adiciona 1-4 produtos aleatórios
    const numProducts = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < numProducts; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      orderProducts.push({
        productId: product.id,
        type: OrderItemType.PRODUCT,
        name: product.name,
        price: Number(product.salePrice),
        quantity: quantity,
        subtotal: Number(product.salePrice) * quantity,
      });
    }

    // 30% de chance de adicionar um serviço
    if (Math.random() > 0.7) {
      const service = services[Math.floor(Math.random() * services.length)];
      orderServices.push({
        serviceId: service.id,
        type: OrderItemType.SERVICE,
        name: service.name,
        price: Number(service.basePrice!),
        quantity: 1,
        subtotal: Number(service.basePrice!),
      });
    }

    const allItems = [...orderProducts, ...orderServices];
    const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = Math.random() > 0.7 ? subtotal * 0.1 : 0; // 30% de chance de desconto
    const total = subtotal - discountAmount;

    // Cria endereço do cliente se não existir
    let address = await prisma.address.findFirst({
      where: { customerId: customer.id },
    });

    if (!address) {
      address = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: AddressType.HOME,
          street: 'Rua Principal',
          number: '100',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          isDefault: true,
        },
      });
    }

    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const createdDaysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - createdDaysAgo);

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        status: status,
        source: Math.random() > 0.5 ? OrderSource.WEB : OrderSource.APP,
        hasProducts: orderProducts.length > 0,
        hasServices: orderServices.length > 0,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        trackingCode: status === 'SHIPPED' || status === 'DELIVERED' ? `BR${Math.random().toString(36).substring(2, 15).toUpperCase()}` : null,
        estimatedDelivery: status !== 'CANCELLED' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
        deliveredAt: status === 'DELIVERED' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        couponCode: discountAmount > 0 ? coupons[Math.floor(Math.random() * coupons.length)].code : null,
        createdAt: createdAt,
        cancelledAt: status === 'CANCELLED' ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
        items: {
          create: allItems,
        },
      },
    });

    orders.push(order);
  }

  console.log(`✅ Created ${orders.length} orders`);

  // =========================================================================
  // REVISIONS (25 revisões)
  // =========================================================================
  console.log('📋 Creating revisions...');

  const checklistCategories = await prisma.checklistCategory.findMany({
    include: { items: true },
  });

  const revisions = [];
  for (let i = 0; i < 25 && i < vehicles.length; i++) {
    const vehicle = vehicles[i];
    const customer = customers.find(c => c.id === vehicle.customerId);
    if (!customer) continue;

    const revisionStatuses: RevisionStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'];
    const status = revisionStatuses[Math.floor(Math.random() * revisionStatuses.length)];

    // Gera checklist items no formato correto (array plano)
    const checklistItems: any[] = [];
    checklistCategories.forEach(category => {
      category.items.forEach(item => {
        const statusOptions = ['OK', 'OK', 'OK', 'ATTENTION', 'NOT_CHECKED', 'CRITICAL'];
        const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        const hasNotes = Math.random() > 0.7;

        checklistItems.push({
          categoryId: category.id,
          categoryName: category.name,
          itemId: item.id,
          itemName: item.name,
          status: randomStatus,
          ...(hasNotes && { notes: `Observação sobre ${item.name.toLowerCase()}` }),
        });
      });
    });

    const daysAgo = Math.floor(Math.random() * 180);
    const revisionDate = new Date();
    revisionDate.setDate(revisionDate.getDate() - daysAgo);

    const revision = await prisma.revision.create({
      data: {
        customerId: customer.id,
        vehicleId: vehicle.id,
        date: revisionDate,
        mileage: vehicle.mileage ? vehicle.mileage + Math.floor(Math.random() * 10000) : null,
        status: status,
        checklistItems: checklistItems,
        generalNotes: 'Revisão realizada conforme checklist padrão.',
        recommendations: status === 'COMPLETED' ? 'Próxima revisão em 10.000 km' : null,
        createdAt: revisionDate,
        completedAt: status === 'COMPLETED' ? new Date(revisionDate.getTime() + 3 * 60 * 60 * 1000) : null,
      },
    });

    revisions.push(revision);
  }

  console.log(`✅ Created ${revisions.length} revisions`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n📊 Comprehensive Seed Summary:');
  console.log('=====================================');
  console.log(`✅ Admins: ${admins.length}`);
  console.log(`✅ Customers: ${customers.length}`);
  console.log(`✅ Addresses: ${customers.length}`);
  console.log(`✅ Vehicle Makes: ${makes.length}`);
  console.log(`✅ Vehicle Models: ${models.length}`);
  console.log(`✅ Vehicle Variants: ${variants.length}`);
  console.log(`✅ Products: ${products.length}`);
  console.log(`✅ Services: ${services.length}`);
  console.log(`✅ Product Compatibility: ${compatibilities.length}`);
  console.log(`✅ Checklist Categories: ${checklistCategories.length}`);
  console.log(`✅ Customer Vehicles: ${vehicles.length}`);
  console.log(`✅ Coupons: ${coupons.length}`);
  console.log(`✅ Promotions: ${promotions.length}`);
  console.log(`✅ Favorites: ${favorites.length}`);
  console.log(`✅ Orders: ${orders.length}`);
  console.log(`✅ Revisions: ${revisions.length}`);
  console.log('=====================================');
  console.log('🎉 Comprehensive seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@moria.com / Test123!');
  console.log('Customer: joao.silva@email.com / Test123!');
  console.log('=====================================');
}

async function seedChecklistData() {
  console.log('📋 Seeding checklist data...');

  const categories = [
    {
      name: 'Freios',
      description: 'Verificação completa do sistema de freios',
      icon: '🛑',
      order: 1,
      items: [
        { name: 'Pastilhas de freio dianteiras', order: 1 },
        { name: 'Pastilhas de freio traseiras', order: 2 },
        { name: 'Discos de freio dianteiros', order: 3 },
        { name: 'Discos de freio traseiros', order: 4 },
        { name: 'Fluido de freio (nível e qualidade)', order: 5 },
        { name: 'Cilindro mestre', order: 6 },
        { name: 'Cilindros de roda', order: 7 },
        { name: 'Freio de mão', order: 8 },
        { name: 'Mangueiras e tubulações', order: 9 },
      ],
    },
    {
      name: 'Suspensão',
      description: 'Verificação do sistema de suspensão',
      icon: '🔧',
      order: 2,
      items: [
        { name: 'Amortecedores dianteiros', order: 1 },
        { name: 'Amortecedores traseiros', order: 2 },
        { name: 'Molas', order: 3 },
        { name: 'Bandejas', order: 4 },
        { name: 'Buchas', order: 5 },
        { name: 'Pivôs', order: 6 },
        { name: 'Barra estabilizadora', order: 7 },
        { name: 'Batentes', order: 8 },
      ],
    },
    {
      name: 'Motor',
      description: 'Verificação geral do motor',
      icon: '⚙️',
      order: 3,
      items: [
        { name: 'Óleo do motor (nível e qualidade)', order: 1 },
        { name: 'Filtro de óleo', order: 2 },
        { name: 'Filtro de ar', order: 3 },
        { name: 'Filtro de combustível', order: 4 },
        { name: 'Velas de ignição', order: 5 },
        { name: 'Cabos de vela', order: 6 },
        { name: 'Correia dentada', order: 7 },
        { name: 'Correia do alternador', order: 8 },
        { name: 'Correia da direção hidráulica', order: 9 },
        { name: 'Vazamentos', order: 10 },
        { name: 'Ruídos anormais', order: 11 },
      ],
    },
    {
      name: 'Sistema de Arrefecimento',
      description: 'Verificação do sistema de refrigeração',
      icon: '🌡️',
      order: 4,
      items: [
        { name: 'Radiador', order: 1 },
        { name: 'Líquido de arrefecimento (nível e qualidade)', order: 2 },
        { name: 'Mangueiras', order: 3 },
        { name: 'Bomba d\'água', order: 4 },
        { name: 'Válvula termostática', order: 5 },
        { name: 'Eletroventilador', order: 6 },
        { name: 'Tampa do radiador', order: 7 },
      ],
    },
    {
      name: 'Sistema Elétrico',
      description: 'Verificação do sistema elétrico',
      icon: '⚡',
      order: 5,
      items: [
        { name: 'Bateria (carga e terminais)', order: 1 },
        { name: 'Alternador', order: 2 },
        { name: 'Motor de arranque', order: 3 },
        { name: 'Faróis dianteiros', order: 4 },
        { name: 'Lanternas traseiras', order: 5 },
        { name: 'Luzes de freio', order: 6 },
        { name: 'Pisca-pisca', order: 7 },
        { name: 'Luz de ré', order: 8 },
        { name: 'Luz da placa', order: 9 },
        { name: 'Fusíveis', order: 10 },
      ],
    },
    {
      name: 'Transmissão',
      description: 'Verificação do sistema de transmissão',
      icon: '🔄',
      order: 6,
      items: [
        { name: 'Óleo da transmissão (nível e qualidade)', order: 1 },
        { name: 'Embreagem', order: 2 },
        { name: 'Pedal da embreagem', order: 3 },
        { name: 'Vazamentos', order: 4 },
        { name: 'Ruídos ao trocar marcha', order: 5 },
        { name: 'Dificuldade ao engatar marchas', order: 6 },
      ],
    },
    {
      name: 'Direção',
      description: 'Verificação do sistema de direção',
      icon: '🎯',
      order: 7,
      items: [
        { name: 'Fluido da direção hidráulica', order: 1 },
        { name: 'Bomba da direção', order: 2 },
        { name: 'Caixa de direção', order: 3 },
        { name: 'Terminais de direção', order: 4 },
        { name: 'Barra axial', order: 5 },
        { name: 'Folgas na direção', order: 6 },
        { name: 'Alinhamento', order: 7 },
        { name: 'Balanceamento', order: 8 },
      ],
    },
    {
      name: 'Pneus e Rodas',
      description: 'Verificação de pneus e rodas',
      icon: '🛞',
      order: 8,
      items: [
        { name: 'Pneu dianteiro esquerdo (calibragem e desgaste)', order: 1 },
        { name: 'Pneu dianteiro direito (calibragem e desgaste)', order: 2 },
        { name: 'Pneu traseiro esquerdo (calibragem e desgaste)', order: 3 },
        { name: 'Pneu traseiro direito (calibragem e desgaste)', order: 4 },
        { name: 'Estepe', order: 5 },
        { name: 'Rodas (estado e parafusos)', order: 6 },
        { name: 'Calotas', order: 7 },
      ],
    },
    {
      name: 'Carroceria e Interior',
      description: 'Verificação da carroceria e interior',
      icon: '🚗',
      order: 9,
      items: [
        { name: 'Portas (funcionamento e travas)', order: 1 },
        { name: 'Vidros elétricos', order: 2 },
        { name: 'Retrovisores', order: 3 },
        { name: 'Limpadores de para-brisa', order: 4 },
        { name: 'Fluido do limpador', order: 5 },
        { name: 'Ar condicionado', order: 6 },
        { name: 'Bancos', order: 7 },
        { name: 'Cintos de segurança', order: 8 },
        { name: 'Painel de instrumentos', order: 9 },
        { name: 'Buzina', order: 10 },
      ],
    },
    {
      name: 'Sistema de Escapamento',
      description: 'Verificação do sistema de escape',
      icon: '💨',
      order: 10,
      items: [
        { name: 'Coletor de escapamento', order: 1 },
        { name: 'Catalisador', order: 2 },
        { name: 'Silencioso', order: 3 },
        { name: 'Ponteira', order: 4 },
        { name: 'Suportes e borrachas', order: 5 },
        { name: 'Vazamentos', order: 6 },
        { name: 'Ruídos excessivos', order: 7 },
      ],
    },
  ];

  for (const categoryData of categories) {
    const { items, ...categoryInfo } = categoryData;

    const category = await prisma.checklistCategory.create({
      data: {
        ...categoryInfo,
        isDefault: true,
        isEnabled: true,
      },
    });

    console.log(`  ✅ Created category: ${category.name}`);

    for (const itemData of items) {
      await prisma.checklistItem.create({
        data: {
          categoryId: category.id,
          name: itemData.name,
          order: itemData.order,
          isDefault: true,
          isEnabled: true,
        },
      });
    }

    console.log(`     ➕ Created ${items.length} items`);
  }

  console.log('✅ Checklist data seeded successfully!');

  // =========================================================================
  // LANDING PAGE CONFIG (Padrão Ferraco)
  // =========================================================================
  console.log('🎨 Creating landing page configuration...');

  const defaultConfig = {
    version: '1.0.0',
    header: {
      enabled: true,
      logo: { url: '/logo_moria.png', alt: 'Moria Peças e Serviços' },
      menuItems: [
        { id: '1', label: 'Início', href: '#inicio', isLink: false },
        { id: '2', label: 'Serviços', href: '#servicos', isLink: false },
        { id: '3', label: 'Peças', href: '#pecas', isLink: false },
        { id: '4', label: 'Promoções', href: '#promocoes', isLink: false },
        { id: '5', label: 'Sobre', href: '/about', isLink: true },
        { id: '6', label: 'Contato', href: '/contact', isLink: true },
      ],
      backgroundColor: '#000000',
      textColor: '#ffffff',
      hoverColor: '#ff6b35',
    },
    hero: {
      enabled: true,
      title: 'MORIA',
      subtitle: 'Peças & Serviços',
      description: 'Especialistas em peças automotivas e serviços de qualidade. Mais de 15 anos cuidando do seu veículo com excelência.',
      features: [
        { id: '1', icon: 'Shield', text: 'Qualidade Garantida' },
        { id: '2', icon: 'Clock', text: 'Entrega Rápida' },
        { id: '3', icon: 'Wrench', text: 'Serviços Especializados' },
        { id: '4', icon: 'Star', text: '15+ Anos no Mercado' },
      ],
      buttons: [
        { id: '1', text: 'Ver Promoções', href: '#promocoes', variant: 'hero', enabled: true },
        { id: '2', text: 'Solicitar Orçamento', href: '#servicos', variant: 'premium', enabled: true },
        { id: '3', text: 'Falar no WhatsApp', href: 'https://wa.me/5511999999999', variant: 'outline', enabled: true },
      ],
      backgroundImage: { url: '/assets/hero-garage.jpg', alt: 'Oficina Moria' },
      overlayOpacity: 70,
    },
    marquee: {
      enabled: true,
      items: [
        { id: '1', icon: '🔧', text: 'PEÇAS ORIGINAIS COM ATÉ 30% DE DESCONTO' },
        { id: '2', icon: '⚡', text: 'SERVIÇOS ESPECIALIZADOS - ORÇAMENTO GRÁTIS' },
        { id: '3', icon: '🚗', text: 'ENTREGA RÁPIDA EM TODA A CIDADE' },
        { id: '4', icon: '🛠️', text: 'QUALIDADE GARANTIDA - ESPECIALISTAS HÁ MAIS DE 15 ANOS' },
        { id: '5', icon: '💰', text: 'PROMOÇÕES IMPERDÍVEIS - CONFIRA NOSSAS OFERTAS' },
      ],
      speed: 30,
      backgroundColor: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
    },
    about: {
      enabled: true,
      title: 'Nossos Serviços',
      subtitle: 'Oferecemos uma gama completa de serviços automotivos com qualidade profissional e preços justos. Sua tranquilidade é nossa prioridade.',
      trustIndicators: [
        { id: '1', icon: 'Shield', iconBackground: 'gold', title: 'Garantia', description: '6 meses em todos os serviços' },
        { id: '2', icon: 'Clock', iconBackground: 'gold', title: 'Agilidade', description: 'Atendimento rápido e eficiente' },
        { id: '3', icon: 'Wrench', iconBackground: 'orange', title: 'Expertise', description: '15+ anos de experiência' },
        { id: '4', icon: 'Zap', iconBackground: 'orange', title: 'Tecnologia', description: 'Equipamentos modernos' },
      ],
    },
    products: {
      enabled: true,
      title: 'Peças Originais',
      subtitle: 'Temos as melhores peças para o seu veículo com preços competitivos e qualidade garantida.',
    },
    services: {
      enabled: true,
      title: 'Promoções Especiais',
      subtitle: 'Aproveite nossas ofertas exclusivas em peças e serviços. Economize mantendo seu veículo em dia!',
    },
    contact: {},
    footer: {
      enabled: true,
      logo: { url: '/logo_moria.png', alt: 'Moria Peças e Serviços' },
      description: 'Especialistas em peças automotivas e serviços de qualidade há mais de 15 anos. Sua tranquilidade é nossa prioridade.',
      contactInfo: {
        address: { street: 'Rua das Oficinas, 123', city: 'Centro - São Paulo/SP', zipCode: 'CEP: 01234-567' },
        phone: '(11) 99999-9999',
        email: 'contato@moriapecas.com.br',
      },
      businessHours: {
        weekdays: 'Segunda a Sexta:\n8:00h às 18:00h',
        saturday: 'Sábado:\n8:00h às 12:00h',
        sunday: 'Domingo:\nFechado',
      },
      services: [
        { id: '1', name: 'Manutenção Preventiva' },
        { id: '2', name: 'Troca de Óleo' },
        { id: '3', name: 'Diagnóstico Eletrônico' },
        { id: '4', name: 'Freios e Suspensão' },
        { id: '5', name: 'Ar Condicionado' },
        { id: '6', name: 'Sistema Elétrico' },
      ],
      socialLinks: [
        { id: '1', platform: 'facebook', url: 'https://facebook.com/moriapecas', enabled: true },
        { id: '2', platform: 'instagram', url: 'https://instagram.com/moriapecas', enabled: true },
      ],
      certifications: [
        { id: '1', icon: 'Wrench', iconBackground: 'gold', title: 'Garantia de 6 Meses', description: 'Em todos os serviços realizados' },
        { id: '2', icon: 'Clock', iconBackground: 'orange', title: 'Atendimento Rápido', description: 'Diagnóstico em até 30 minutos' },
        { id: '3', icon: 'MapPin', iconBackground: 'gold', title: 'Entrega na Região', description: 'Peças entregues em até 24h' },
      ],
      copyright: '© 2024 Moria Peças e Serviços. Todos os direitos reservados.',
      bottomLinks: [
        { id: '1', text: 'Política de Privacidade', href: '#' },
        { id: '2', text: 'Termos de Uso', href: '#' },
        { id: '3', text: 'Garantia', href: '#' },
      ],
    },
  };

  await prisma.landingPageConfig.create({
    data: {
      header: JSON.stringify(defaultConfig.header),
      hero: JSON.stringify(defaultConfig.hero),
      marquee: JSON.stringify(defaultConfig.marquee),
      about: JSON.stringify(defaultConfig.about),
      products: JSON.stringify(defaultConfig.products),
      services: JSON.stringify(defaultConfig.services),
      contact: JSON.stringify(defaultConfig.contact),
      footer: JSON.stringify(defaultConfig.footer),
      contactPage: JSON.stringify({}),
      aboutPage: JSON.stringify({}),
    },
  });

  console.log('✅ Landing page configuration seeded successfully!');

  // =========================================================================
  // FAQ
  // =========================================================================
  await seedFAQ();
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
