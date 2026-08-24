import { PrismaClient } from '@prisma/client';

/**
 * Catalogo de revisao completo (140+ itens).
 *
 * Este seed e IDEMPOTENTE de proposito: ele NAO apaga nada. O `seed.ts` da raiz
 * faz `checklistItem.deleteMany()` + `checklistCategory.deleteMany()` e por isso
 * nao pode ser usado para carregar catalogo em banco que ja esta em producao —
 * levaria junto tudo que a oficina customizou.
 *
 * Aqui a regra e:
 *   - categoria: casa por `name`; se existir, reaproveita (nao mexe em icon,
 *     description nem isEnabled que o lojista possa ter alterado);
 *   - item: casa por `name` dentro da categoria; se existir, nao toca. So os
 *     que faltam sao criados, com `order` continuando do maior ja existente.
 *
 * Rodar quantas vezes quiser e seguro.
 *
 * Fontes do conteudo (checklists de revisao usados por oficinas):
 *   - omecanico.com.br/check-list-completo/
 *   - blog.doutorie.com.br/checklist-de-entrada-e-revisao-de-veiculos-para-oficinas/
 */

type ItemSeed = { name: string };
type CategoriaSeed = {
  name: string;
  description: string;
  icon: string;
  order: number;
  items: ItemSeed[];
};

export const CHECKLIST_COMPLETO: CategoriaSeed[] = [
  {
    name: 'Freios',
    description: 'Verificação completa do sistema de freios',
    icon: '🛑',
    order: 1,
    items: [
      { name: 'Pastilhas de freio dianteiras' },
      { name: 'Pastilhas de freio traseiras' },
      { name: 'Discos de freio dianteiros' },
      { name: 'Discos de freio traseiros' },
      { name: 'Tambores de freio' },
      { name: 'Sapatas e lonas de freio' },
      { name: 'Fluido de freio (nível e qualidade)' },
      { name: 'Cilindro mestre' },
      { name: 'Cilindros de roda' },
      { name: 'Servo freio (hidrovácuo)' },
      { name: 'Freio de mão' },
      { name: 'Mangueiras e tubulações' },
      { name: 'Flexíveis de freio' },
      { name: 'Sensor de desgaste das pastilhas' },
      { name: 'Funcionamento do ABS' },
      { name: 'Teste de frenagem em pista' },
    ],
  },
  {
    name: 'Suspensão',
    description: 'Verificação do sistema de suspensão',
    icon: '🔧',
    order: 2,
    items: [
      { name: 'Amortecedores dianteiros' },
      { name: 'Amortecedores traseiros' },
      { name: 'Molas' },
      { name: 'Bandejas' },
      { name: 'Buchas' },
      { name: 'Pivôs' },
      { name: 'Barra estabilizadora' },
      { name: 'Bieletas' },
      { name: 'Batentes' },
      { name: 'Coifas da suspensão' },
      { name: 'Coxins e rolamentos do amortecedor' },
      { name: 'Rolamentos de roda' },
      { name: 'Altura e nivelamento do veículo' },
      { name: 'Ruídos na suspensão em lombada' },
    ],
  },
  {
    name: 'Motor',
    description: 'Verificação geral do motor',
    icon: '⚙️',
    order: 3,
    items: [
      { name: 'Óleo do motor (nível e qualidade)' },
      { name: 'Filtro de óleo' },
      { name: 'Filtro de ar' },
      { name: 'Filtro de combustível' },
      { name: 'Velas de ignição' },
      { name: 'Cabos de vela' },
      { name: 'Bobina de ignição' },
      { name: 'Correia dentada' },
      { name: 'Correia do alternador' },
      { name: 'Correia da direção hidráulica' },
      { name: 'Tensionadores e polias' },
      { name: 'Coxins do motor' },
      { name: 'Bomba de combustível' },
      { name: 'Bicos injetores' },
      { name: 'Corpo de borboleta' },
      { name: 'Sensor de oxigênio (sonda lambda)' },
      { name: 'Ventilação do cárter' },
      { name: 'Junta do cabeçote (sinais de falha)' },
      { name: 'Vazamentos' },
      { name: 'Ruídos anormais' },
      { name: 'Marcha lenta' },
      { name: 'Leitura de códigos de falha (scanner)' },
    ],
  },
  {
    name: 'Sistema de Arrefecimento',
    description: 'Verificação do sistema de refrigeração',
    icon: '🌡️',
    order: 4,
    items: [
      { name: 'Radiador' },
      { name: 'Líquido de arrefecimento (nível e qualidade)' },
      { name: 'Mangueiras' },
      { name: "Bomba d'água" },
      { name: 'Válvula termostática' },
      { name: 'Eletroventilador' },
      { name: 'Tampa do radiador' },
      { name: 'Reservatório de expansão' },
      { name: 'Interruptor térmico do radiador' },
      { name: 'Sensor de temperatura' },
      { name: 'Teste de pressão do sistema' },
    ],
  },
  {
    name: 'Sistema Elétrico',
    description: 'Verificação do sistema elétrico',
    icon: '⚡',
    order: 5,
    items: [
      { name: 'Bateria (carga e terminais)' },
      { name: 'Alternador' },
      { name: 'Motor de arranque' },
      { name: 'Faróis dianteiros' },
      { name: 'Alinhamento e altura dos faróis' },
      { name: 'Farol de milha / neblina' },
      { name: 'Lanternas traseiras' },
      { name: 'Luzes de freio' },
      { name: 'Brake light (terceira luz de freio)' },
      { name: 'Pisca-pisca' },
      { name: 'Pisca-alerta' },
      { name: 'Luz de ré' },
      { name: 'Luz da placa' },
      { name: 'Iluminação interna' },
      { name: 'Luzes de advertência do painel' },
      { name: 'Fusíveis' },
      { name: 'Chicote e conectores' },
      { name: 'Aterramento (massa)' },
    ],
  },
  {
    name: 'Transmissão',
    description: 'Verificação do sistema de transmissão',
    icon: '🔄',
    order: 6,
    items: [
      { name: 'Óleo da transmissão (nível e qualidade)' },
      { name: 'Embreagem' },
      { name: 'Pedal da embreagem' },
      { name: 'Fluido da embreagem' },
      { name: 'Cabo / atuador da embreagem' },
      { name: 'Homocinéticas e coifas' },
      { name: 'Semieixos' },
      { name: 'Diferencial' },
      { name: 'Vazamentos' },
      { name: 'Ruídos ao trocar marcha' },
      { name: 'Dificuldade ao engatar marchas' },
      { name: 'Teste de rodagem (trocas sob carga)' },
    ],
  },
  {
    name: 'Direção',
    description: 'Verificação do sistema de direção',
    icon: '🎯',
    order: 7,
    items: [
      { name: 'Fluido da direção hidráulica' },
      { name: 'Bomba da direção' },
      { name: 'Caixa de direção' },
      { name: 'Terminais de direção' },
      { name: 'Barra axial' },
      { name: 'Coifas da caixa de direção' },
      { name: 'Coluna de direção' },
      { name: 'Folgas na direção' },
      { name: 'Direção elétrica (assistência e erros)' },
      { name: 'Alinhamento' },
      { name: 'Balanceamento' },
      { name: 'Cambagem e cáster' },
    ],
  },
  {
    name: 'Pneus e Rodas',
    description: 'Verificação de pneus e rodas',
    icon: '🛞',
    order: 8,
    items: [
      { name: 'Pneu dianteiro esquerdo (calibragem e desgaste)' },
      { name: 'Pneu dianteiro direito (calibragem e desgaste)' },
      { name: 'Pneu traseiro esquerdo (calibragem e desgaste)' },
      { name: 'Pneu traseiro direito (calibragem e desgaste)' },
      { name: 'Profundidade da banda de rodagem (TWI)' },
      { name: 'Desgaste irregular dos pneus' },
      { name: 'Data de fabricação (DOT) dos pneus' },
      { name: 'Estepe (estado e calibragem)' },
      { name: 'Rodas (estado e parafusos)' },
      { name: 'Torque dos parafusos de roda' },
      { name: 'Bicos e tampas das válvulas' },
      { name: 'Sensor de pressão (TPMS)' },
      { name: 'Calotas' },
    ],
  },
  {
    name: 'Carroceria e Interior',
    description: 'Verificação da carroceria e interior',
    icon: '🚗',
    order: 9,
    items: [
      { name: 'Portas (funcionamento e travas)' },
      { name: 'Vidros elétricos' },
      { name: 'Retrovisores' },
      { name: 'Limpadores de para-brisa' },
      { name: 'Palhetas do limpador' },
      { name: 'Esguichos do para-brisa' },
      { name: 'Reservatório do limpador' },
      { name: 'Ar condicionado (gás e funcionamento)' },
      { name: 'Filtro de cabine (ar condicionado)' },
      { name: 'Bancos' },
      { name: 'Cintos de segurança' },
      { name: 'Painel de instrumentos' },
      { name: 'Buzina' },
      { name: 'Rádio e alto-falantes' },
      { name: 'Antena' },
      { name: 'Tapetes e forrações' },
      { name: 'Riscos e amassados na lataria' },
      { name: 'Estado da pintura' },
      { name: 'Assoalho e sinais de corrosão' },
      { name: 'Para-brisa e vidros (trincas)' },
    ],
  },
  {
    name: 'Sistema de Escapamento',
    description: 'Verificação do sistema de escape',
    icon: '💨',
    order: 10,
    items: [
      { name: 'Coletor de escapamento' },
      { name: 'Catalisador' },
      { name: 'Silencioso' },
      { name: 'Ponteira' },
      { name: 'Suportes e borrachas' },
      { name: 'Vazamentos' },
      { name: 'Ruídos excessivos' },
      { name: 'Fumaça anormal no escapamento' },
      { name: 'Emissões / opacidade' },
    ],
  },
  {
    name: 'Itens de Segurança',
    description: 'Equipamentos obrigatórios e itens de segurança',
    icon: '🦺',
    order: 11,
    items: [
      { name: 'Triângulo de sinalização' },
      { name: 'Macaco' },
      { name: 'Chave de roda' },
      { name: 'Extintor de incêndio (quando exigido)' },
      { name: 'Manual do proprietário' },
      { name: 'Documento do veículo (CRLV)' },
      { name: 'Airbags (luz de advertência)' },
      { name: 'Travas de segurança das portas traseiras' },
    ],
  },
  {
    name: 'Fluidos e Níveis',
    description: 'Conferência geral de fluidos',
    icon: '🛢️',
    order: 12,
    items: [
      { name: 'Nível do óleo do motor' },
      { name: 'Nível do fluido de freio' },
      { name: 'Nível do líquido de arrefecimento' },
      { name: 'Nível do fluido da direção' },
      { name: 'Nível do fluido da embreagem' },
      { name: 'Nível do fluido do limpador' },
      { name: 'Nível do óleo do câmbio' },
      { name: 'Vazamentos sob o veículo' },
    ],
  },
  {
    name: 'Inspeção Geral',
    description: 'Conferência de entrada e teste final',
    icon: '📋',
    order: 13,
    items: [
      { name: 'Quilometragem atual' },
      { name: 'Nível de combustível na entrada' },
      { name: 'Objetos pessoais no veículo' },
      { name: 'Mensagens e avisos do painel' },
      { name: 'Data da última revisão' },
      { name: 'Teste de rodagem final' },
      { name: 'Observações do cliente' },
    ],
  },
];

export async function seedChecklistCompleto(prisma: PrismaClient) {
  let criadosCat = 0;
  let criadosItem = 0;

  for (const cat of CHECKLIST_COMPLETO) {
    let categoria = await prisma.checklistCategory.findFirst({
      where: { name: cat.name },
    });

    if (!categoria) {
      categoria = await prisma.checklistCategory.create({
        data: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          order: cat.order,
          isDefault: true,
          isEnabled: true,
        },
      });
      criadosCat++;
    }

    const existentes = await prisma.checklistItem.findMany({
      where: { categoryId: categoria.id },
      select: { name: true, order: true },
    });
    const jaTem = new Set(existentes.map((i) => i.name));
    // Continua a numeracao a partir do maior `order` presente para nao
    // reordenar itens que o lojista ja posicionou.
    let proximo = existentes.reduce((m, i) => Math.max(m, i.order), 0);

    for (const item of cat.items) {
      if (jaTem.has(item.name)) continue;
      proximo++;
      await prisma.checklistItem.create({
        data: {
          categoryId: categoria.id,
          name: item.name,
          order: proximo,
          isDefault: true,
          isEnabled: true,
        },
      });
      criadosItem++;
    }
  }

  const totalItens = await prisma.checklistItem.count();
  const totalCats = await prisma.checklistCategory.count();
  console.log(
    `✅ Checklist completo: +${criadosCat} categorias, +${criadosItem} itens (total agora: ${totalCats} categorias / ${totalItens} itens)`
  );
}

// Permite rodar direto: `npx tsx prisma/seeds/checklist-completo.ts`
if (process.argv[1] && process.argv[1].includes('checklist-completo')) {
  const prisma = new PrismaClient();
  seedChecklistCompleto(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
