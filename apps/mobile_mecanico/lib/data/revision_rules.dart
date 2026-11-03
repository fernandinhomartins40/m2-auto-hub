import 'models.dart';

/// Regras do checklist, as mesmas de `StepChecklist` e `RevisionEditPage` no
/// painel web. Ficam fora das telas porque decidem o que é gravado na revisão.

/// O checklist persistido sempre contém o catálogo inteiro: o que o mecânico
/// não tocou segue como `NOT_CHECKED`. Itens já gravados são preservados, mesmo
/// que tenham saído do catálogo depois.
List<CheckEntry> mergeCatalog(
  List<CheckEntry> saved,
  List<CatalogCategory> catalog,
) {
  final known = saved.map((entry) => entry.itemId).toSet();
  return [
    ...saved,
    for (final category in catalog)
      for (final item in category.items)
        if (!known.contains(item.id))
          CheckEntry(
            itemId: item.id,
            itemName: item.name,
            categoryId: category.id,
            categoryName: category.name,
          ),
  ];
}

class ChecklistProgress {
  const ChecklistProgress(this.checked, this.total);

  factory ChecklistProgress.of(List<CheckEntry> entries) => ChecklistProgress(
        entries.where((e) => e.status != CheckStatus.notChecked).length,
        entries.length,
      );

  final int checked;
  final int total;

  double get ratio => total == 0 ? 0 : checked / total;
  int get notChecked => total - checked;
}

/// Linha do orçamento ligada ao item do checklist que a originou.
class BudgetLine {
  const BudgetLine({required this.originItemId, required this.item});

  final String originItemId;
  final OrderItem item;
}

/// Monta o corpo da OS gerada ao finalizar a revisão.
///
/// [checkIds] vem da resposta do salvamento: sem ele a linha da OS perde o
/// vínculo com o item avaliado.
Map<String, dynamic> buildRevisionOrder({
  required Revision revision,
  required List<CheckEntry> entries,
  required List<BudgetLine> lines,
  required Map<String, String> checkIds,
  required int mileage,
}) {
  final evaluated =
      entries.where((e) => e.status != CheckStatus.notChecked).toList();
  final notEvaluated = entries.length - evaluated.length;
  final vehicle = revision.vehicle;

  return {
    'customerId': revision.customerId,
    'vehicleId': revision.vehicleId,
    'customerName': revision.customer?.name ?? 'Cliente da revisão',
    'customerPhone': revision.customer?.phone,
    'vehicleLabel': vehicle?.label ?? '',
    'vehiclePlate': vehicle?.plate,
    'mileage': mileage == 0 ? null : mileage,
    'assignedMechanicId': revision.assignedMechanicId,
    'revisionId': revision.id,
    'description': [
      for (final entry in evaluated)
        '${entry.itemName} — ${entry.status.api}'
            '${entry.notes.isEmpty ? '' : ': ${entry.notes}'}',
      '$notEvaluated item(ns) não avaliado(s)',
    ].join('\n'),
    'items': [
      for (final line in lines)
        {
          ...line.item.toJson(),
          'revisionCheckId': checkIds[line.originItemId],
        },
    ],
  };
}
