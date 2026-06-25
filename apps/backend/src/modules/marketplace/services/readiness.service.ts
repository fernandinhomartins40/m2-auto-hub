import { MarketplaceProvider, MarketplaceConnectionStatus } from '@prisma/client';
import { environment } from '@config/environment.js';
import { connectionService } from './connection.service.js';
import { oauthService } from './oauth.service.js';
import { ReadinessItem } from '../marketplace.types.js';

/** Passo do guia burocratico exibido no wizard do frontend. */
export interface OnboardingStep {
  title: string;
  description: string;
  link?: { label: string; url: string };
}

export interface ProviderGuide {
  provider: MarketplaceProvider;
  displayName: string;
  redirectUri: string;
  webhookUrl: string;
  recommendedScopes: string[];
  consoleUrl: string;
  steps: OnboardingStep[];
  prerequisites: string[];
  /** True quando o provider tem etapa de aprovacao demorada (Shopee). */
  hasApprovalGate: boolean;
}

const ML_GUIDE = (redirectUri: string, webhookUrl: string): ProviderGuide => ({
  provider: MarketplaceProvider.MERCADO_LIVRE,
  displayName: 'Mercado Livre',
  redirectUri,
  webhookUrl,
  // Topicos de notificacao recomendados (campo "Tópicos" do formulario do ML)
  recommendedScopes: ['orders_v2', 'items', 'questions', 'shipments', 'messages'],
  consoleUrl: 'https://developers.mercadolivre.com.br/devcenter',
  hasApprovalGate: false,
  prerequisites: [
    'Ter uma conta de vendedor profissional no Mercado Livre, com os dados do titular validados.',
    'Você precisa ser administrador da conta para autorizar a integração.',
    'Não pode haver documentos pendentes na conta (senão a autorização falha).',
  ],
  steps: [
    {
      title: 'Abrir o DevCenter e criar uma aplicação',
      description:
        'Acesse o DevCenter, clique em "Criar aplicação" e escolha o propósito "Negócios".',
      link: { label: 'Abrir DevCenter', url: 'https://developers.mercadolivre.com.br/devcenter' },
    },
    {
      title: 'Informações básicas',
      description:
        'Preencha Nome (até 50 caracteres), Nome curto (gera a URL — letras/números/sublinhado), Descrição (até 150 caracteres) e envie o Logotipo (.png de até 1MB).',
    },
    {
      title: 'URIs de redirect',
      description:
        'Em "URIs de redirect", clique em "Adicionar URI de redirect" e cole exatamente a Redirect URI fornecida abaixo. O endereço precisa ser HTTPS.',
    },
    {
      title: 'Fluxos OAuth',
      description:
        'Marque "Authorization Code" e "Refresh Token". NÃO marque "PKCE necessário" — esta integração não usa PKCE e marcá-lo impede a conexão.',
    },
    {
      title: 'Unidade de negócio e permissões',
      description:
        'Em Negócios, selecione "Mercado Livre". Nas permissões, defina LEITURA E ESCRITA para: "Usuários", "Publicação e sincronização" e "Venda e envios de um produto". Opcionalmente, dê acesso a "Comunicações pré e pós-vendas".',
    },
    {
      title: 'Tópicos (notificações de vendas)',
      description:
        'Marque os tópicos: orders_v2, items, questions e shipments. Esses eventos é que trazem as vendas para o M2.',
    },
    {
      title: 'URL de notificação (callback)',
      description:
        'No campo "URL de retornos de chamada de notificação", cole a URL de webhook fornecida abaixo (somente letras minúsculas).',
    },
    {
      title: 'Aceitar termos e criar',
      description:
        'Aceite os Termos e Condições e clique em "Criar". Depois copie o App ID e a Secret Key e cole no passo seguinte aqui no M2.',
    },
  ],
});

const SHOPEE_GUIDE = (redirectUri: string, webhookUrl: string): ProviderGuide => ({
  provider: MarketplaceProvider.SHOPEE,
  displayName: 'Shopee',
  redirectUri,
  webhookUrl,
  recommendedScopes: ['product', 'order', 'logistics', 'shop'],
  consoleUrl: 'https://open.shopee.com',
  hasApprovalGate: true,
  prerequisites: [
    'Ter uma loja de vendedor ativa na Shopee Brasil (seller.shopee.com.br).',
    'Solicitar acesso à Shopee Open Platform — esse processo passa por aprovação e pode levar alguns dias.',
    'Ter logística (canais de frete) configurada na loja antes de publicar produtos.',
  ],
  steps: [
    {
      title: 'Entrar na Shopee Open Platform (região BR)',
      description: 'Acesse a Open Platform e faça login com seu usuário de vendedor.',
      link: { label: 'Abrir Open Platform', url: 'https://open.shopee.com' },
    },
    {
      title: 'Solicitar acesso à Open Platform',
      description:
        'Conclua o processo de solicitação de acesso. Atenção: passa por aprovação e pode levar dias. O M2 avisará quando puder concluir.',
      link: { label: 'Passo a passo (Shopee BR)', url: 'https://seller.br.shopee.cn/edu/article/3445' },
    },
    {
      title: 'Criar o app e obter partner_id / partner_key',
      description: 'Crie um aplicativo na Open Platform e copie o Partner ID e a Partner Key.',
    },
    {
      title: 'Configurar a Redirect URL e o Push (webhook)',
      description:
        'Cole a Redirect URL e configure o Push Mechanism com a URL de webhook fornecida abaixo (eventos de pedido).',
    },
    {
      title: 'Salvar credenciais e autorizar a loja',
      description:
        'Cole o Partner ID (App ID) e a Partner Key (Secret) no M2, salve, e clique em "Autorizar loja" para concluir.',
    },
  ],
});

/** Calcula o checklist de prontidao e o guia burocratico de cada provider. */
export class ReadinessService {
  guide(provider: MarketplaceProvider): ProviderGuide {
    const redirectUri = oauthService.redirectUri(provider);
    const webhookUrl = oauthService.webhookUrl(provider);
    return provider === MarketplaceProvider.MERCADO_LIVRE
      ? ML_GUIDE(redirectUri, webhookUrl)
      : SHOPEE_GUIDE(redirectUri, webhookUrl);
  }

  async readiness(provider: MarketplaceProvider): Promise<ReadinessItem[]> {
    const conn = await connectionService.getRaw(provider);
    const httpsOk = environment.app.baseUrl.startsWith('https://');

    const items: ReadinessItem[] = [
      {
        key: 'public_https',
        label: 'URL pública com HTTPS configurada (necessária para callbacks/webhooks)',
        status: httpsOk ? 'ok' : 'manual',
        hint: httpsOk ? undefined : `Base atual: ${environment.app.baseUrl}. Configure APP_BASE_URL com https em produção.`,
      },
      {
        key: 'credentials',
        label: 'Credenciais do app (App ID / Secret) salvas',
        status: conn?.appId && conn?.appSecret ? 'ok' : 'pending',
      },
      {
        key: 'authorized',
        label: 'Conta autorizada (tokens OAuth válidos)',
        status: conn?.status === MarketplaceConnectionStatus.CONNECTED ? 'ok' : 'pending',
      },
    ];

    if (provider === MarketplaceProvider.SHOPEE) {
      items.splice(1, 0, {
        key: 'open_platform_approval',
        label: 'Acesso à Shopee Open Platform aprovado',
        status: conn?.appId ? 'ok' : 'manual',
        hint: 'Solicite o acesso na Open Platform da Shopee. Pode levar alguns dias até a aprovação.',
      });
    }

    return items;
  }
}

export const readinessService = new ReadinessService();
