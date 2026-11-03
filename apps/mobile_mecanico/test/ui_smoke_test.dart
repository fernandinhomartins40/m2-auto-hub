import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:m2_core/m2_core.dart';
import 'package:m2_mecanico/data/models.dart';
import 'package:m2_mecanico/features/revisions/checklist_row.dart';
import 'package:m2_mecanico/shared/ui.dart';

/// Renderiza as peças novas na largura de um celular comum, para pegar
/// estouro de layout antes de abrir o app.
Future<void> _pump(WidgetTester tester, Widget child) async {
  tester.view.physicalSize = const Size(412 * 2.625, 915 * 2.625);
  tester.view.devicePixelRatio = 2.625;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      home: PanelScaffold(
        body: ListView(padding: const EdgeInsets.all(16), children: [child]),
      ),
    ),
  );
}

const _entry = CheckEntry(
  itemId: 'i1',
  itemName: 'Fluido de freio (nível e qualidade)',
  categoryId: 'c1',
  categoryName: 'Freios',
  status: CheckStatus.attention,
  notes: 'Leve vazamento',
);

void main() {
  testWidgets('cartão de avaliação confirma o estado escolhido', (tester) async {
    CheckEntry? confirmed;
    await _pump(
      tester,
      EvaluationCard(
        entry: _entry,
        onConfirm: (entry) => confirmed = entry,
        onClose: () {},
      ),
    );
    await tester.tap(find.text('Crítico'));
    await tester.pump();
    await tester.tap(find.text('Confirmar avaliação'));
    expect(confirmed?.status, CheckStatus.critical);
    expect(confirmed?.notes, 'Leve vazamento');
    expect(tester.takeException(), isNull);
  });

  testWidgets('item avaliado e filtros cabem no celular', (tester) async {
    await _pump(
      tester,
      Column(
        children: [
          EvaluatedRow(entry: _entry, onReopen: () {}, onClear: () {}),
          FilterPills(
            labels: const ['Todas', 'Pendentes', 'Em andamento', 'Concluídas'],
            counts: const [1, 0, 1, 0],
            index: 0,
            onChanged: (_) {},
          ),
          const StepDots(step: 2, total: 3),
          const DashedBox(child: Text('Nenhum item adicionado')),
          revisionStatusChip('IN_PROGRESS'),
        ],
      ),
    );
    expect(find.text('Atenção'), findsOneWidget);
    expect(find.text('Em Andamento'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
