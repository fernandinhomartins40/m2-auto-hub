import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:m2_cliente/main.dart' as app;
import 'package:m2_core/m2_core.dart';

import 'e2e.dart';

/// Abre o app de verdade contra o backend de teste do CI (seed + ci-e2e.ts).
///
/// Regras do roteiro (as listas do app são preguiçosas):
/// - o marcador de cada tela é fixo: título da AppBar, item ativo da barra
///   inferior ou aba ativa; texto de dentro da lista vai em `content:`;
/// - todo toque passa por `e.tap`, que rola até o alvo antes;
/// - `e.backTo` só fecha telas empilhadas e espera um marcador fixo.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('cliente: login e todas as telas', (tester) async {
    final e = E2E(binding, tester);
    Finder nav(String label) => find.descendant(
          of: find.byType(PanelBottomNav),
          matching: find.text(label),
        );
    Finder navOn(String label) => e.active(PanelBottomNav, label);
    Finder tab(String label) => find.descendant(
          of: find.byType(WorkspaceTabs),
          matching: find.text(label),
        );
    Finder tabOn(String label) => e.active(WorkspaceTabs, label);
    Finder appBar(String title, {bool prefix = false}) => find.descendant(
          of: find.byType(AppBar),
          matching: prefix ? find.textContaining(title) : find.text(title),
        );
    final shell = find.byType(PanelBottomNav);

    // O menu "Mais" é um diálogo por cima do painel: o item dele é o último.
    Future<void> openMenu(String item) async {
      await e.tap(nav('Mais'));
      await e.waitFor(find.text('Sair da Conta'));
      await e.tap(find.text(item).last);
    }

    await app.main();
    await e.screen('login', find.text('Fazer Login'));

    await e.tap(find.text('Recuperar senha por e-mail'));
    await e.screen('esqueci-a-senha', find.text('Recuperar senha'),
        content: find.text('Enviar link de recuperação'));
    await e.backTo(find.text('Fazer Login'));

    await e.type(find.byType(TextFormField).at(0), 'joao.silva@email.com');
    await e.type(find.byType(TextFormField).at(1), 'Test123!');
    await e.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await e.screen('inicio', navOn('Início'),
        content: find.text('O que você quer fazer?'));

    // Orçamento respondido pela loja (ci-e2e.ts): detalhe e aprovação. A tela
    // se fecha sozinha depois de aprovar; o teste só espera ela sumir.
    await e.tap(find.text('Orçamento pronto para aprovar'));
    await e.screen('orcamento-detalhe', appBar('Orçamento #', prefix: true),
        content: find.text('Aprovar e Virar Pedido'));
    await e.tap(find.text('Aprovar e Virar Pedido'));
    await e.screen('orcamento-aprovar', find.text('Aprovar orçamento?'));
    await e.tap(find.widgetWithText(TextButton, 'Aprovar'));
    await e.waitGone(appBar('Orçamento #', prefix: true));
    await e.screen('orcamento-aprovado', navOn('Início'));

    await e.tap(nav('Compras'));
    await e.screen('compras-pedidos', navOn('Compras'),
        content: find.text('Meus pedidos'));
    await e.tap(find.text('Ver Detalhes'));
    await e.screen('pedido-detalhe', appBar('Pedido #', prefix: true));
    await e.backTo(navOn('Compras'));
    await e.tap(tab('Orçamentos'));
    await e.screen('compras-orcamentos', tabOn('Orçamentos'),
        content: find.text('Meus orçamentos'));

    await e.tap(nav('Veículo'));
    await e.screen('veiculos', navOn('Veículo'),
        content: find.text('Meus veículos'));
    await e.tap(find.text('Cadastrar Veículo'));
    await e.screen('cadastro-de-veiculo', appBar('Cadastrar Novo Veículo'));
    await e.backTo(navOn('Veículo'));
    await e.tap(tab('Revisões'));
    await e.screen('revisoes', tabOn('Revisões'),
        content: find.text('Minhas revisões'));
    await e.tap(find.textContaining('Todas ('));
    await e.tap(find.text('Ver detalhes completos'));
    await e.screen('revisao-detalhe', appBar('Detalhes da Revisão'));
    await e.backTo(navOn('Veículo'));

    await e.tap(nav('Ajuda'));
    await e.screen('suporte', navOn('Ajuda'),
        content: find.text('Suporte ao cliente'));
    await e.tap(find.text('Chamado E2E'));
    await e.screen('chamado', appBar('Chamado E2E'),
        content: find.text('Mensagem do teste E2E.'));
    await e.backTo(navOn('Ajuda'));
    await e.tap(find.text('Novo Ticket'));
    await e.screen('novo-chamado', appBar('Criar Novo Ticket'));
    await e.backTo(navOn('Ajuda'));

    await e.tap(nav('Mais'));
    await e.screen('menu-mais', find.text('Sair da Conta'));
    await e.tap(find.text('Benefícios').last);
    await e.screen('beneficios-favoritos', tabOn('Favoritos'),
        content: find.text('Meus favoritos'));
    await e.tap(tab('Cupons'));
    await e.screen('beneficios-cupons', tabOn('Cupons'),
        content: find.text('Cupons disponíveis'));

    await openMenu('Conta');
    await e.screen('conta-dados-pessoais', tabOn('Dados Pessoais'),
        content: find.text('Meu perfil'));
    await e.tap(tab('Segurança'));
    await e.screen('conta-seguranca', tabOn('Segurança'),
        content: find.text('Alterar Senha'));
    await e.tap(tab('Endereços'));
    await e.screen('conta-enderecos', tabOn('Endereços'),
        content: find.text('Meus Endereços'));
    await e.tap(tab('Notificações'));
    await e.screen('conta-notificacoes', tabOn('Notificações'));

    await openMenu('Alterar senha');
    await e.screen('alterar-senha', appBar('Alterar senha'));
    await e.backTo(shell);

    // Excluir conta: abre a confirmação e volta sem excluir.
    await openMenu('Privacidade');
    await e.screen('privacidade', appBar('Privacidade'),
        content: find.text('Excluir minha conta'));
    await e.tap(find.text('Excluir minha conta'));
    await e.screen('excluir-conta-confirmacao', find.text('Excluir sua conta?'));
    await e.tap(find.widgetWithText(TextButton, 'Voltar'));
    await e.waitGone(find.text('Excluir sua conta?'));
    expect(appBar('Privacidade'), findsOneWidget);
    await e.backTo(shell);

    await e.tap(nav('Início'));
    await e.screen('inicio-final', navOn('Início'));
  });
}
