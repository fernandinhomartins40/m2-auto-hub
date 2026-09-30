import { prisma } from '../config/database.js';
import { HashUtil } from '../shared/utils/hash.util.js';

async function updateCustomerPasswords() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Este script de manutencao nao pode ser executado em production');
  }

  const temporaryPassword = process.env.TEMP_CUSTOMER_PASSWORD;
  if (!temporaryPassword || temporaryPassword.length < 12) {
    throw new Error('Defina TEMP_CUSTOMER_PASSWORD com pelo menos 12 caracteres');
  }

  console.log('Starting password update...');

  const customers = await prisma.customer.findMany();

  for (const customer of customers) {
    const hashedPassword = await HashUtil.hashPassword(temporaryPassword);
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        phone: cleanPhone,
      },
    });

  }

  console.log(`Password update completed for ${customers.length} customers.`);
  process.exit(0);
}

updateCustomerPasswords().catch((error) => {
  console.error('Error updating passwords:', error);
  process.exit(1);
});
