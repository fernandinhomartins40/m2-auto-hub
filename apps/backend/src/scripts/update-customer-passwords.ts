import { prisma } from '../config/database.js';
import { HashUtil } from '../shared/utils/hash.util.js';

async function updateCustomerPasswords() {
  console.log('Starting password update...');

  const customers = await prisma.customer.findMany();

  for (const customer of customers) {
    const temporaryPassword = customer.name.trim().toLowerCase().substring(0, 3);
    const hashedPassword = await HashUtil.hashPassword(temporaryPassword);
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        phone: cleanPhone,
      },
    });

    console.log(`Updated customer: ${customer.email} - Phone: ${cleanPhone} - Password: ${temporaryPassword}`);
  }

  console.log('Password update completed!');
  process.exit(0);
}

updateCustomerPasswords().catch((error) => {
  console.error('Error updating passwords:', error);
  process.exit(1);
});
