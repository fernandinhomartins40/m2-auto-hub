import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:m2_core/m2_core.dart';

// Cópia idêntica em apps/mobile_mecanico/integration_test/e2e.dart.

/// Passos do teste de ponta a ponta: esperar a tela, conferir que não há
/// erro e salvar a imagem. Tudo em tempo real, contra o backend de teste.
class E2E {
  E2E(this.binding, this.tester);

  final IntegrationTestWidgetsFlutterBinding binding;
  final WidgetTester tester;
  int _shots = 0;
  bool _surfaceReady = false;

  Future<void> pause([int ms = 300]) =>
      tester.pump(Duration(milliseconds: ms));

  Future<void> waitFor(Finder finder, {int seconds = 30}) async {
    final end = DateTime.now().add(Duration(seconds: seconds));
    while (finder.evaluate().isEmpty) {
      if (DateTime.now().isAfter(end)) {
        // Mostra no log o que estava na tela e salva a imagem da falha.
        final texts = find
            .byType(Text)
            .evaluate()
            .map((el) => (el.widget as Text).data ?? '')
            .where((t) => t.trim().isNotEmpty)
            .toSet()
            .join(' | ');
        // ignore: avoid_print
        print('NA TELA: $texts');
        try {
          await shot('FALHA');
        } catch (_) {}
        fail('Não apareceu em ${seconds}s: $finder');
      }
      await pause(250);
    }
  }

  /// Espera sumir todo indicador de carregamento; se não sumir, a tela travou.
  Future<void> settle({int seconds = 30}) async {
    final end = DateTime.now().add(Duration(seconds: seconds));
    final spinner = find.byType(CircularProgressIndicator);
    do {
      await pause(250);
      if (DateTime.now().isAfter(end)) fail('Tela travada carregando por ${seconds}s');
    } while (spinner.evaluate().isNotEmpty);
    await pause(500);
  }

  void expectNoError(String where) {
    final error = tester.takeException();
    expect(error, isNull, reason: '$where: exceção $error');
    expect(find.byType(ErrorWidget), findsNothing, reason: '$where: ErrorWidget');
    expect(find.byType(ErrorState), findsNothing, reason: '$where: tela de erro');
    expect(find.text('Tentar novamente'), findsNothing, reason: '$where: erro de carga');
    // showMessage(error: true) é o único SnackBar com cor de fundo própria.
    expect(
      find.byWidgetPredicate((w) => w is SnackBar && w.backgroundColor != null),
      findsNothing,
      reason: '$where: aviso de erro',
    );
  }

  /// Espera [visible], confere erros e salva a imagem como `NN-name.png`.
  Future<void> screen(String name, Finder visible) async {
    await waitFor(visible);
    await settle();
    expectNoError(name);
    await shot(name);
  }

  Future<void> shot(String name) async {
    if (Platform.isAndroid && !_surfaceReady) {
      await binding.convertFlutterSurfaceToImage();
      _surfaceReady = true;
    }
    await pause();
    _shots++;
    await binding.takeScreenshot('${_shots.toString().padLeft(2, '0')}-$name');
  }

  /// Rola a lista visível até [finder] aparecer (primeiro para baixo, depois
  /// para cima, porque a aba pode ter ficado rolada de uma visita anterior).
  Future<void> scrollTo(Finder finder) async {
    final lists = find
        .byWidgetPredicate(
          (w) => w is Scrollable && axisDirectionToAxis(w.axisDirection) == Axis.vertical,
        )
        .hitTestable();
    for (final dy in [-300.0, 300.0]) {
      for (var i = 0; i < 15 && finder.evaluate().isEmpty; i++) {
        if (lists.evaluate().isEmpty) break;
        await tester.drag(lists.first, Offset(0, dy));
        await pause();
      }
    }
    await waitFor(finder, seconds: 5);
    await tester.ensureVisible(finder.first);
    await pause();
  }

  Future<void> tap(Finder finder) async {
    await scrollTo(finder);
    await tester.tap(finder.first);
    await pause(600);
  }

  Future<void> type(Finder field, String text) async {
    await scrollTo(field);
    await tester.enterText(field.first, text);
    await pause();
  }

  /// Volta como o botão "voltar" do sistema até [target] aparecer.
  Future<void> backTo(Finder target) async {
    for (var i = 0; i < 6 && target.hitTestable().evaluate().isEmpty; i++) {
      await tester.state<NavigatorState>(find.byType(Navigator).last).maybePop();
      await pause(800);
    }
    await waitFor(target);
    await settle();
  }
}
