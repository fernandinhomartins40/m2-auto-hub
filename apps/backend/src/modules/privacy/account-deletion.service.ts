import { CustomerStatus, NotificationRecipientType, Prisma } from '@prisma/client';

export const DELETED_CUSTOMER_NAME = 'Cliente excluído';
export const DELETION_SUMMARY =
  'Conta excluída. Apagamos ou anonimizamos nome, e-mail, telefone, CPF, data de nascimento, senha, endereços, placas e dados dos veículos, favoritos, notificações e mensagens de relacionamento. '
  + 'Ficam, sem seus dados pessoais, os registros de pedidos, orçamentos, revisões, ordens de serviço, pontos de fidelidade e atendimentos, além das notas fiscais, pelo prazo exigido em lei (em regra 5 anos). '
  + 'Registros de consentimento e desta solicitação ficam como prova do atendimento ao seu pedido.';

/**
 * Anonimiza o titular no lugar, sem apagar a linha: pedidos, revisões e ordens de serviço
 * apontam para ela e precisam continuar consultáveis pela loja (obrigação fiscal e de defesa).
 * Retorna false se a conta já estava excluída (pedido repetido).
 */
export async function anonymizeCustomer(tx: Prisma.TransactionClient, customerId: string): Promise<boolean> {
  const now = new Date();
  const { count } = await tx.customer.updateMany({
    where: { id: customerId, deletedAt: null },
    data: {
      name: DELETED_CUSTOMER_NAME,
      email: `excluido-${customerId}@deleted.invalid`,
      phone: '',
      cpf: null,
      birthDate: null,
      // Senha vazia nunca confere no login; passwordChangedAt invalida os tokens já emitidos.
      password: '',
      status: CustomerStatus.INACTIVE,
      emailVerifiedAt: null,
      lastLoginAt: null,
      passwordChangedAt: now,
      deletedAt: now,
    },
  });
  if (count === 0) return false;

  // Pedidos antigos referenciam o endereço: apaga o conteúdo de todos e remove os que nada usa.
  await tx.address.updateMany({
    where: { customerId },
    data: { street: 'Removido', number: '0', complement: null, neighborhood: 'Removido', zipCode: '00000000', isDefault: false },
  });
  await tx.address.deleteMany({ where: { customerId, orders: { none: {} } } });

  // Veículos ficam (as revisões dependem deles), mas sem placa, chassi, cor e município.
  const vehicles = await tx.customerVehicle.findMany({ where: { customerId }, select: { id: true } });
  for (const vehicle of vehicles) {
    await tx.customerVehicle.update({
      where: { id: vehicle.id },
      data: { plate: `EXCLUIDO-${vehicle.id}`, chassisNumber: null, color: null, city: null, state: null },
    });
  }

  await tx.serviceOrder.updateMany({
    where: { customerId },
    data: { customerName: DELETED_CUSTOMER_NAME, customerPhone: null, vehiclePlate: null, vehicleLabel: null },
  });
  await tx.favorite.deleteMany({ where: { customerId } });
  await tx.emailActionToken.deleteMany({ where: { customerId } });
  await tx.relationshipMessage.deleteMany({ where: { customerId } });
  await tx.notification.deleteMany({ where: { recipientType: NotificationRecipientType.CUSTOMER, recipientId: customerId } });
  return true;
}
