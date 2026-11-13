import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:m2_cliente/main.dart' as app;
import 'package:m2_core/m2_core.dart';

import 'e2e.dart';

/// Abre o app de verdade contra o backend de teste do CI (seed + ci-e2e.ts).
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('cliente: login e todas as telas', (tester) async {
    final e = E2E(binding, tester);
    Finder nav(String label) => find.descendant(
          of: find.byType(PanelBottomNav),
          matching: find.text(label),
        );
    Finder tab(String label) => find.descendant(
          of: find.byType(WorkspaceTabs),
          matching: find.text(label),
        );
    Finder appBar(String title) => find.descendant(
          of: find.byType(AppBar),
          matching: find.text(title),
        );
    // O menu "Mais" é um diálogo por cima do painel: o item dele é o último.
    Future<void> openMenu(String item) async {
      await e.tap(nav('Mais'));
      await e.waitFor(find.text('Sair da Conta'));
      await e.tap(find.text(item).last);
    }

    final home = find.textContaining('Olá');

    await app.main();
    await e.screen('login', find.text('Fazer Login'));

    await e.tap(find.text('Recuperar senha por e-mail'));
    await e.screen('esqueci-a-senha', find.text('Enviar link de recuperação'));
    await e.backTo(find.text('Fazer Login'));

    await e.type(find.byType(TextFormField).at(0), 'joao.silva@email.com');
    await e.type(find.byType(TextFormField).at(1), 'Test123!');
    await e.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await e.screen('inicio', home);

    // Orçamento respondido pela loja (ci-e2e.ts): detalhe e aprovação.
    await e.tap(find.text('Orçamento pronto para aprovar'));
    await e.screen('orcamento-detalhe', find.text('Aprovar e Virar Pedido'));
    await e.tap(find.text('Aprovar e Virar Pedido'));
    await e.screen('orcamento-aprovar', find.text('Aprovar orçamento?'));
    await e.tap(find.widgetWithText(TextButton, 'Aprovar'));
    await e.backTo(home);
    e.expectNoError('aprovação do orçamento');

    await e.tap(nav('Compras'));
    await e.screen('compras-pedidos', find.text('Meus pedidos'));
    await e.tap(find.text('Ver Detalhes'));
    await e.screen(
      'pedido-detalhe',
      find.descendant(of: find.byType(AppBar), matching: find.textContaining('Pedido #')),
    );
    await e.backTo(find.text('Meus pedidos'));
    await e.tap(tab('Orçamentos'));
    await e.screen('compras-orcamentos', find.text('Meus orçamentos'));

    await e.tap(nav('Veículo'));
    await e.screen('veiculos', find.text('Meus veículos'));
    await e.tap(find.text('Cadastrar Veículo'));
    await e.screen('cadastro-de-veiculo', appBar('Cadastrar Novo Veículo'));
    await e.backTo(find.text('Meus veículos'));
    await e.tap(tab('Revisões'));
    await e.screen('revisoes', find.text('Minhas revisões'));
    await e.tap(find.textContaining('Todas ('));
    await e.tap(find.text('Ver detalhes completos'));
    await e.screen('revisao-detalhe', appBar('Detalhes da Revisão'));
    await e.backTo(find.text('Minhas revisões'));

    await e.tap(nav('Ajuda'));
    await e.screen('suporte', find.text('Suporte ao cliente'));
    await e.tap(find.text('Chamado E2E'));
    await e.screen('chamado', find.text('Mensagem do teste E2E.'));
    await e.backTo(find.text('Suporte ao cliente'));
    await e.tap(find.text('Novo Ticket'));
    await e.screen('novo-chamado', appBar('Criar Novo Ticket'));
    await e.backTo(find.text('Suporte ao cliente'));

    await e.tap(nav('Mais'));
    await e.screen('menu-mais', find.text('Sair da Conta'));
    await e.tap(find.text('Benefícios').last);
    await e.screen('beneficios-favoritos', find.text('Meus favoritos'));
    await e.tap(tab('Cupons'));
    await e.screen('beneficios-cupons', find.text('Cupons disponíveis'));

    await openMenu('Conta');
    await e.screen('conta-dados-pessoais', find.text('Meu perfil'));
    await e.tap(tab('Segurança'));
    await e.screen('conta-seguranca', find.text('Meu perfil'));
    await e.tap(tab('Endereços'));
    await e.screen('conta-enderecos', find.text('Meu perfil'));
    await e.tap(tab('Notificações'));
    // Aba e título da lista têm o mesmo texto: espera os dois.
    await e.screen('conta-notificacoes', find.text('Notificações').at(1));

    await openMenu('Alterar senha');
    await e.screen('alterar-senha', appBar('Alterar senha'));
    await e.backTo(nav('Início'));

    // Excluir conta: abre a confirmação e volta sem excluir.
    await openMenu('Privacidade');
    await e.screen('privacidade', find.text('Excluir minha conta'));
    await e.tap(find.text('Excluir minha conta'));
    await e.screen('excluir-conta-confirmacao', find.text('Excluir sua conta?'));
    await e.tap(find.widgetWithText(TextButton, 'Voltar'));
    await e.waitFor(find.text('Excluir minha conta'));
    expect(find.text('Excluir sua conta?'), findsNothing);
    await e.backTo(nav('Início'));
    await e.tap(nav('Início'));
    await e.screen('inicio-final', home);
  });
}
