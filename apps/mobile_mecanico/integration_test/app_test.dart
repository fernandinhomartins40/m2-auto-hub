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

    await app.main();
    await e.screen('login', find.text('Entrar no Painel'));

    await e.tap(find.text('Recuperar senha por e-mail'));
    await e.screen('esqueci-a-senha', find.text('Enviar link de recuperação'));
    await e.backTo(find.text('Entrar no Painel'));

    await e.type(find.byType(TextFormField).at(0), 'mecanico@moria.com');
    await e.type(find.byType(TextFormField).at(1), 'Test123!');
    await e.tap(find.text('Entrar no Painel'));
    await e.screen('revisoes', find.text('Total de revisões'));

    // Detalhe da revisão concluída e o PDF que o botão "Exportar PDF" baixa.
    // O botão em si abre o compartilhamento nativo, que tiraria o app da
    // frente; por isso o PDF é pedido direto à API com a sessão do app.
    await e.tap(find.text('Ver'));
    await e.screen('revisao-detalhe', find.text('Exportar PDF'));
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
    await e.tap(find.text('Fechar'));

    // "Concluir" abre a revisão e, em seguida, o orçamento. Volta sem gerar OS.
    await e.tap(find.text('Concluir'));
    await e.screen('orcamento', find.text('Concluir e gerar OS'));
    await e.backTo(find.text('Total de revisões'));

    await e.tap(tab('Ordens de serviço'));
    await e.screen('ordens-de-servico', find.text('Minhas Ordens de Serviço'));
    await e.tap(find.text('Ver'));
    await e.screen('ordem-de-servico-detalhe', find.textContaining('OS #'));
    await e.backTo(find.text('Minhas Ordens de Serviço'));

    // Consulta de placa digitada (sem câmera). A placa é do veículo do João.
    await e.tap(find.text('Criação rápida (ler placa)'));
    await e.screen('consulta-de-placa', find.text('Consultar'));
    await e.type(
      find.descendant(
        of: find.byType(PlateLookupScreen),
        matching: find.byType(TextField),
      ),
      'ABC1234',
    );
    await e.tap(find.text('Consultar'));
    await e.screen('nova-os-pela-placa', find.text('Nova Ordem de Serviço'));
    await e.backTo(find.text('Minhas Ordens de Serviço'));

    await e.tap(nav('Perfil'));
    await e.screen('perfil', find.text('Informações do Perfil'));
    await e.tap(find.byTooltip('Estatísticas'));
    await e.screen('perfil-estatisticas', find.text('Estatísticas de Trabalho'));
    await e.tap(find.byTooltip('Histórico'));
    await e.screen('perfil-historico', find.text('Histórico de Atividades'));
  });
}
