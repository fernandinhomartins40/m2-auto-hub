import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <Helmet><title>Privacidade | M2 Center Auto</title><meta name="description" content="Aviso de privacidade e direitos dos titulares de dados da M2 Center Auto." /></Helmet>
      <article className="mx-auto max-w-3xl space-y-6">
        <div><p className="text-sm text-muted-foreground">Versão 30/09/2026</p><h1 className="text-3xl font-bold">Aviso de privacidade</h1><p className="mt-2 text-muted-foreground">Este aviso explica como a M2 Center Auto trata dados pessoais em seu site, aplicativos, vendas e serviços automotivos.</p></div>
        <Card><CardHeader><CardTitle>Dados e finalidades</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Tratamos cadastro, contato, CPF quando necessário, endereços, veículos, pedidos, pagamentos, atendimentos, fidelidade e registros de segurança.</p><p>Usamos esses dados para executar contratos e serviços, atender solicitações, cumprir obrigações legais, prevenir fraude e, somente quando aplicável, enviar comunicações opcionais.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Compartilhamento e conservação</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Dados podem ser compartilhados com operadores necessários, como hospedagem, pagamentos, entregas, e-mail e marketplaces, sob deveres de segurança e finalidade.</p><p>Conservamos dados pelo tempo necessário à finalidade e às obrigações legais. Depois, eliminamos ou anonimizamos de forma segura, considerando também backups.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Seus direitos</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Você pode pedir confirmação, acesso, correção, portabilidade, informação, oposição, revogação e eliminação quando legalmente aplicável. Solicitações autenticadas podem ser abertas no perfil do cliente.</p><p>Para dúvidas, use o atendimento oficial informado na página de contato. A identidade poderá ser validada proporcionalmente ao risco antes da entrega ou alteração de dados.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Segurança e escolhas</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Aplicamos controles de acesso, criptografia em trânsito, registros de auditoria e monitoramento. Nenhum sistema é isento de risco; incidentes relevantes serão tratados conforme a legislação.</p><p>Armazenamento essencial não pode ser desligado enquanto você usa funções autenticadas. Medição e marketing dependem da sua escolha, que pode ser alterada limpando as preferências do site para reabrir o painel.</p></CardContent></Card>
        <Button asChild variant="outline"><a href="/">Voltar ao início</a></Button>
      </article>
    </main>
  );
}
