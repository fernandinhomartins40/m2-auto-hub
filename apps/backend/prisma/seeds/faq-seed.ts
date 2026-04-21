import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedFAQ() {
  console.log('🌱 Seeding FAQ data...');

  // Categorias FAQ
  const categories = [
    {
      name: 'Pedidos e Compras',
      description: 'Dúvidas sobre como fazer pedidos e processar compras',
      icon: '🛒',
      order: 1,
      items: [
        {
          question: 'Como faço um pedido?',
          answer: 'Para fazer um pedido, navegue pelo catálogo, adicione os produtos desejados ao carrinho e clique em "Finalizar Compra". Você será guiado através do processo de pagamento e entrega.',
          order: 1,
          keywords: ['pedido', 'comprar', 'carrinho', 'checkout'],
        },
        {
          question: 'Posso cancelar meu pedido?',
          answer: 'Sim, você pode cancelar seu pedido enquanto ele estiver com status "Pendente" ou "Confirmado". Após isso, entre em contato com o suporte para verificar a possibilidade de cancelamento.',
          order: 2,
          keywords: ['cancelar', 'pedido', 'cancelamento'],
        },
        {
          question: 'Como acompanho meu pedido?',
          answer: 'Acesse "Meus Pedidos" no painel do cliente. Lá você pode ver o status atualizado de todos os seus pedidos e o código de rastreamento quando disponível.',
          order: 3,
          keywords: ['acompanhar', 'rastreio', 'status', 'pedido'],
        },
      ],
    },
    {
      name: 'Pagamento',
      description: 'Informações sobre formas de pagamento e cobranças',
      icon: '💳',
      order: 2,
      items: [
        {
          question: 'Quais formas de pagamento são aceitas?',
          answer: 'Aceitamos cartão de crédito (Visa, Mastercard, Elo), Pix, boleto bancário e transferência bancária. O pagamento é processado de forma segura.',
          order: 1,
          keywords: ['pagamento', 'cartão', 'pix', 'boleto'],
        },
        {
          question: 'Quando o pagamento é cobrado?',
          answer: 'O pagamento é cobrado no momento da confirmação do pedido. Para boleto e Pix, o pagamento deve ser efetuado em até 24 horas.',
          order: 2,
          keywords: ['cobrança', 'pagamento', 'quando'],
        },
        {
          question: 'Posso parcelar minha compra?',
          answer: 'Sim, compras no cartão de crédito podem ser parceladas em até 12x sem juros para compras acima de R$ 500.',
          order: 3,
          keywords: ['parcelar', 'parcela', 'cartão', 'crédito'],
        },
      ],
    },
    {
      name: 'Entrega',
      description: 'Informações sobre prazos e custos de entrega',
      icon: '📦',
      order: 3,
      items: [
        {
          question: 'Qual o prazo de entrega?',
          answer: 'O prazo de entrega varia de acordo com sua localização e é calculado automaticamente no checkout. Geralmente leva de 3 a 15 dias úteis.',
          order: 1,
          keywords: ['prazo', 'entrega', 'tempo', 'dias'],
        },
        {
          question: 'Quanto custa o frete?',
          answer: 'O custo do frete é calculado automaticamente com base no CEP de entrega e peso dos produtos. Oferecemos frete grátis para compras acima de R$ 500 em regiões selecionadas.',
          order: 2,
          keywords: ['frete', 'custo', 'grátis', 'entrega'],
        },
        {
          question: 'Posso retirar no local?',
          answer: 'Sim, oferecemos opção de retirada na loja. Selecione "Retirar na Loja" no checkout e você será notificado quando o pedido estiver pronto.',
          order: 3,
          keywords: ['retirar', 'loja', 'local', 'pickup'],
        },
      ],
    },
    {
      name: 'Produtos',
      description: 'Dúvidas sobre produtos e compatibilidade',
      icon: '🔧',
      order: 4,
      items: [
        {
          question: 'Como sei se uma peça é compatível com meu veículo?',
          answer: 'Use o filtro de compatibilidade no catálogo. Selecione marca, modelo e ano do seu veículo para ver apenas peças compatíveis. Em caso de dúvida, consulte nosso suporte.',
          order: 1,
          keywords: ['compatibilidade', 'peça', 'veículo', 'carro'],
        },
        {
          question: 'Os produtos têm garantia?',
          answer: 'Sim, todos os produtos têm garantia do fabricante. O prazo varia de acordo com o produto, geralmente entre 90 dias e 1 ano. Consulte a descrição do produto para mais detalhes.',
          order: 2,
          keywords: ['garantia', 'produto', 'defeito'],
        },
        {
          question: 'Posso trocar um produto?',
          answer: 'Sim, você tem até 7 dias após o recebimento para solicitar troca ou devolução, desde que o produto esteja em perfeito estado e na embalagem original.',
          order: 3,
          keywords: ['troca', 'devolução', 'produto'],
        },
      ],
    },
    {
      name: 'Conta e Cadastro',
      description: 'Gerenciamento de conta e dados pessoais',
      icon: '👤',
      order: 5,
      items: [
        {
          question: 'Como criar uma conta?',
          answer: 'Clique em "Entrar" no menu superior e selecione "Criar Conta". Preencha seus dados e confirme seu email. Pronto, sua conta está criada!',
          order: 1,
          keywords: ['criar', 'conta', 'cadastro', 'registrar'],
        },
        {
          question: 'Esqueci minha senha, o que faço?',
          answer: 'Na tela de login, clique em "Esqueci minha senha". Digite seu email e você receberá um link para redefinir sua senha.',
          order: 2,
          keywords: ['senha', 'esqueci', 'recuperar', 'redefinir'],
        },
        {
          question: 'Como altero meus dados cadastrais?',
          answer: 'Acesse "Meu Perfil" no painel do cliente. Lá você pode editar seus dados pessoais, endereços e preferências.',
          order: 3,
          keywords: ['alterar', 'dados', 'perfil', 'editar'],
        },
      ],
    },
    {
      name: 'Revisões Veiculares',
      description: 'Serviços de revisão e manutenção',
      icon: '🔍',
      order: 6,
      items: [
        {
          question: 'Como agendar uma revisão?',
          answer: 'Acesse "Minhas Revisões" no painel e clique em "Agendar Revisão". Escolha a data, adicione informações do veículo e pronto!',
          order: 1,
          keywords: ['agendar', 'revisão', 'manutenção'],
        },
        {
          question: 'Quanto tempo demora uma revisão?',
          answer: 'O tempo varia de acordo com o tipo de revisão. Uma revisão básica leva cerca de 1-2 horas, enquanto revisões completas podem levar o dia todo. Você será informado no agendamento.',
          order: 2,
          keywords: ['tempo', 'revisão', 'demora'],
        },
        {
          question: 'Recebo um relatório da revisão?',
          answer: 'Sim, após cada revisão você recebe um checklist completo com tudo que foi verificado e eventuais recomendações de manutenção.',
          order: 3,
          keywords: ['relatório', 'checklist', 'revisão'],
        },
      ],
    },
  ];

  for (const categoryData of categories) {
    const { items, ...categoryInfo } = categoryData;

    const category = await prisma.fAQCategory.upsert({
      where: { name: categoryData.name },
      update: categoryInfo,
      create: categoryInfo,
    });

    for (const item of items) {
      const existing = await prisma.fAQItem.findFirst({
        where: {
          categoryId: category.id,
          question: item.question,
        },
      });

      if (existing) {
        await prisma.fAQItem.update({
          where: { id: existing.id },
          data: {
            answer: item.answer,
            order: item.order,
            keywords: item.keywords,
          },
        });
      } else {
        await prisma.fAQItem.create({
          data: {
            categoryId: category.id,
            question: item.question,
            answer: item.answer,
            order: item.order,
            keywords: item.keywords,
          },
        });
      }
    }
  }

  console.log('✅ FAQ seeded successfully');
}
