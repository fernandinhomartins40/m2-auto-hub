import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:m2_core/m2_core.dart';
import 'package:m2_mecanico/data/providers.dart';
import 'package:m2_mecanico/features/orders/plate_lookup_screen.dart';
import 'package:m2_mecanico/main.dart' as app;

import 'e2e.dart';

/// Abre o app de verdade contra o backend de teste do CI (seed + ci-e2e.ts).
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('mecânico: login e todas as telas', (tester) async {
    final e = E2E(binding, tester);
    Finder nav(String label) => find.descendant(
          of: find.byType(PanelBottomNav),
          matching: find.text(label),
        );
    Finder tab(String label) => find.descendant(
          of: find.byType(WorkspaceTabs),
          matching: find.text(label),
        );

    Finder navOn(String label) => e.active(PanelBottomNav, label);
    Finder tabOn(String label) => e.active(WorkspaceTabs, label);
    Finder appBar(String title, {bool prefix = false}) => find.descendant(
          of: find.byType(AppBar),
          matching: prefix ? find.textContaining(title) : find.text(title),
        );

    await app.main();
    await e.screen('login', find.text('Entrar no Painel'));

    await e.tap(find.text('Recuperar senha por e-mail'));
    await e.screen('esqueci-a-senha', find.text('Enviar link de recuperação'));
    await e.backTo(find.text('Entrar no Painel'));

    await e.type(find.byType(TextFormField).at(0), 'mecanico@moria.com');
    await e.type(find.byType(TextFormField).at(1), 'Test123!');
    await e.tap(find.text('Entrar no Painel'));
    // As abas Revisões | Ordens de serviço ficam fora da lista: marcador fixo.
    await e.screen('revisoes', tabOn('Revisões'),
        content: find.text('Total de revisões'));

    // Detalhe da revisão e o PDF que o botão "Exportar PDF" baixa. O botão
    // abre o compartilhamento nativo, que tiraria o app da frente; por isso o
    // PDF é pedido direto à API com a sessão do app.
    await e.tap(find.text('Ver'));
    await e.screen('revisao-detalhe', appBar('Revisão #', prefix: true),
        content: find.text('Exportar PDF'));
    final container = ProviderScope.containerOf(
      tester.element(find.text('Exportar PDF')),
    );
    final revisions = await container.read(apiProvider).revisions();
    final pdf = await container.read(dioProvider).post<List<int>>(
          '/admin/revisions/${revisions.first.id}/export-pdf',
          data: const <String, dynamic>{},
          options: Options(
            responseType: ResponseType.bytes,
            receiveTimeout: const Duration(seconds: 60),
          ),
        );
    expect(String.fromCharCodes(pdf.data!.take(4)), '%PDF');
    await e.backTo(tabOn('Revisões'));

    // "Concluir" abre a revisão e, em seguida, o orçamento. Volta sem gerar OS.
    await e.tap(find.text('Concluir'));
    await e.screen('orcamento', appBar('Continuar Revisão'),
        content: find.text('Concluir e gerar OS'));
    await e.backTo(tabOn('Revisões'));

    await e.tap(tab('Ordens de serviço'));
    await e.screen('ordens-de-servico', tabOn('Ordens de serviço'),
        content: find.text('Minhas Ordens de Serviço'));
    await e.tap(find.text('Ver'));
    await e.screen('ordem-de-servico-detalhe', appBar('OS #', prefix: true));
    await e.backTo(tabOn('Ordens de serviço'));

    // Consulta de placa digitada (sem câmera). A placa é do veículo do João.
    await e.tap(find.text('Criação rápida (ler placa)'));
    await e.screen('consulta-de-placa', appBar('Ler placa'));
    await e.type(
      find.descendant(
        of: find.byType(PlateLookupScreen),
        matching: find.byType(TextField),
      ),
      'ABC1234',
    );
    await e.tap(find.text('Consultar'));
    await e.screen('nova-os-pela-placa', appBar('Nova Ordem de Serviço'));
    await e.backTo(tabOn('Ordens de serviço'));

    await e.tap(nav('Perfil'));
    await e.screen('perfil', navOn('Perfil'),
        content: find.text('Informações do Perfil'));
    await e.tap(find.byTooltip('Estatísticas'));
    await e.screen('perfil-estatisticas', navOn('Perfil'),
        content: find.text('Estatísticas de Trabalho'));
    await e.tap(find.byTooltip('Histórico'));
    await e.screen('perfil-historico', navOn('Perfil'),
        content: find.text('Histórico de Atividades'));
  });
}
