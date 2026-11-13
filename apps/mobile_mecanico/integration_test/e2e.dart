import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:m2_core/m2_core.dart';

// Cópia idêntica em apps/mobile_cliente/integration_test/e2e.dart.

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

  /// Espera [marker] (algo fixo da tela: AppBar, aba ativa, barra inferior),
  /// rola até [content] se houver, confere erros e salva `NN-name.png`.
  Future<void> screen(String name, Finder marker, {Finder? content}) async {
    await waitFor(marker);
    await settle();
    if (content != null) await scrollTo(content);
    expectNoError(name);
    await shot(name);
  }

  /// Espera [finder] sumir (por exemplo, a tela que se fecha sozinha).
  Future<void> waitGone(Finder finder, {int seconds = 30}) async {
    final end = DateTime.now().add(Duration(seconds: seconds));
    while (finder.evaluate().isNotEmpty) {
      if (DateTime.now().isAfter(end)) fail('Não sumiu em ${seconds}s: $finder');
      await pause(250);
    }
    await settle();
  }

  /// Aba ou item da barra inferior marcado como ativo (`Semantics.selected`)
  /// dentro de [bar] (`PanelBottomNav` ou `WorkspaceTabs`). Fica fora das
  /// listas, então serve de marcador fixo da tela.
  Finder active(Type bar, String label) => find.descendant(
        of: find.byType(bar),
        matching: find.ancestor(
          of: find.text(label),
          matching: find.byWidgetPredicate(
            (w) => w is Semantics && w.properties.selected == true,
          ),
        ),
      );

  Future<void> shot(String name) async {
    if (Platform.isAndroid && !_surfaceReady) {
      await binding.convertFlutterSurfaceToImage();
      _surfaceReady = true;
    }
    await pause();
    _shots++;
    await binding.takeScreenshot('${_shots.toString().padLeft(2, '0')}-$name');
  }

  Finder get _lists => find
      .byWidgetPredicate(
        (w) => w is Scrollable && axisDirectionToAxis(w.axisDirection) == Axis.vertical,
      )
      .hitTestable();

  /// Rola a lista visível até [finder] existir. As listas são preguiçosas:
  /// item fora da tela nem é construído. Primeiro volta ao topo (sem arrastar,
  /// para não disparar o "puxar para atualizar"), depois desce aos poucos.
  Future<void> scrollTo(Finder finder) async {
    if (finder.evaluate().isEmpty) await settle();
    if (finder.evaluate().isEmpty) {
      for (final element in _lists.evaluate()) {
        final position = (element as StatefulElement).state as ScrollableState;
        position.position.jumpTo(position.position.minScrollExtent);
      }
      await pause();
    }
    for (var i = 0; i < 20 && finder.evaluate().isEmpty; i++) {
      if (_lists.evaluate().isEmpty) break;
      await tester.drag(_lists.first, const Offset(0, -300));
      await pause();
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

  /// Volta como o botão "voltar" do sistema, só enquanto houver tela
  /// empilhada. Na casca das abas o "voltar" leva ao Início (PopScope), por
  /// isso nunca é acionado ali. Depois espera [target], que deve ser fixo.
  Future<void> backTo(Finder target) async {
    for (var i = 0; i < 6; i++) {
      final navigator = tester.state<NavigatorState>(find.byType(Navigator).last);
      if (!navigator.canPop()) break;
      await navigator.maybePop();
      await pause(800);
    }
    await waitFor(target);
    await settle();
  }
}
