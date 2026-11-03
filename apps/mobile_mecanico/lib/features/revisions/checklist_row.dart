import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../shared/ui.dart';

/// Peças do checklist, copiadas de `StepChecklist` no PWA.

/// Carinhas em vez de rótulos, como no PWA: o mecânico está com o celular na
/// mão, muitas vezes de luva, e reconhece a cor mais rápido do que lê a palavra.
class StatusOption {
  const StatusOption(
    this.status,
    this.label,
    this.icon,
    this.solid,
    this.lightText,
    this.lightBorder,
    this.lightFill,
  );

  final CheckStatus status;
  final String label;
  final IconData icon;

  /// `ativo`: fundo cheio.
  final Color solid;

  /// `leve`: texto, borda e fundo claros.
  final Color lightText;
  final Color lightBorder;
  final Color lightFill;
}

const statusOptions = [
  StatusOption(
    CheckStatus.ok,
    'Bom',
    LucideIcons.smile,
    green600,
    Color(0xFF15803D),
    Color(0xFF86EFAC),
    Color(0xFFF0FDF4),
  ),
  StatusOption(
    CheckStatus.attention,
    'Atenção',
    LucideIcons.meh,
    amber500,
    Color(0xFFB45309),
    Color(0xFFFCD34D),
    Color(0xFFFFFBEB),
  ),
  StatusOption(
    CheckStatus.critical,
    'Crítico',
    LucideIcons.frown,
    red600,
    Color(0xFFB91C1C),
    Color(0xFFFCA5A5),
    Color(0xFFFEF2F2),
  ),
];

StatusOption? optionOf(CheckStatus status) {
  for (final option in statusOptions) {
    if (option.status == status) return option;
  }
  return null;
}

/// Cartão do item em avaliação: um por vez, some quando confirmado.
class EvaluationCard extends StatefulWidget {
  const EvaluationCard({
    super.key,
    required this.entry,
    required this.onConfirm,
    required this.onClose,
  });

  final CheckEntry entry;
  final ValueChanged<CheckEntry> onConfirm;
  final VoidCallback onClose;

  @override
  State<EvaluationCard> createState() => _EvaluationCardState();
}

class _EvaluationCardState extends State<EvaluationCard> {
  late CheckStatus _status = widget.entry.status;
  late final _notes = TextEditingController(text: widget.entry.notes);

  @override
  void didUpdateWidget(EvaluationCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.entry.itemId != widget.entry.itemId) {
      _status = widget.entry.status;
      _notes.text = widget.entry.notes;
    }
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final canConfirm = statusOptions.any((o) => o.status == _status);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primary.withValues(alpha: 0.4),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.itemName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        height: 1.2,
                        color: AppTheme.slate950,
                      ),
                    ),
                    Text(
                      entry.categoryName,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Fechar',
                iconSize: 16,
                visualDensity: VisualDensity.compact,
                onPressed: widget.onClose,
                icon: const Icon(LucideIcons.x),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final option in statusOptions) ...[
                if (option != statusOptions.first) const SizedBox(width: 8),
                Expanded(child: _optionButton(option)),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.muted.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Row(
                  children: [
                    Icon(
                      LucideIcons.messageSquareText,
                      size: 14,
                      color: AppTheme.primary,
                    ),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          text: 'Observação do item ',
                          children: [
                            TextSpan(
                              text: '(opcional)',
                              style: TextStyle(
                                fontWeight: FontWeight.w400,
                                color: AppTheme.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _notes,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Ex.: desgaste irregular, troca recomendada...',
                    fillColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: canConfirm
                ? () => widget.onConfirm(
                      entry.copyWith(
                        status: _status,
                        notes: _notes.text.trim(),
                      ),
                    )
                : null,
            icon: const Icon(LucideIcons.check),
            label: const Text('Confirmar avaliação'),
          ),
        ],
      ),
    );
  }

  Widget _optionButton(StatusOption option) {
    final active = _status == option.status;
    return Semantics(
      button: true,
      selected: active,
      label: option.label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: () => setState(() => _status = option.status),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          height: 64,
          decoration: BoxDecoration(
            color: active ? option.solid : option.lightFill,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: active ? option.solid : option.lightBorder,
              width: 2,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                option.icon,
                size: 24,
                color: active ? Colors.white : option.lightText,
              ),
              const SizedBox(height: 2),
              Text(
                option.label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: active ? Colors.white : option.lightText,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Linha de "Itens já avaliados": ponto colorido, nome, selo e observação.
class EvaluatedRow extends StatelessWidget {
  const EvaluatedRow({
    super.key,
    required this.entry,
    required this.onReopen,
    this.onClear,
  });

  final CheckEntry entry;
  final VoidCallback onReopen;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final option = optionOf(entry.status);
    final label = option?.label ?? 'Não se aplica';
    return InkWell(
      onTap: onReopen,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: option?.solid ?? gray400,
                shape: BoxShape.circle,
              ),
              child: Icon(
                option?.icon ?? LucideIcons.minus,
                size: 14,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        entry.itemName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: option?.lightFill ?? gray50,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: option?.lightBorder ?? AppTheme.border,
                          ),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: option?.lightText ?? gray600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.categoryName,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  if (entry.notes.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(
                            text: 'Observação: ',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          TextSpan(text: entry.notes),
                        ],
                      ),
                      style: const TextStyle(fontSize: 12, color: gray600),
                    ),
                  ],
                ],
              ),
            ),
            if (onClear != null)
              IconButton(
                tooltip: 'Remover avaliação',
                iconSize: 14,
                visualDensity: VisualDensity.compact,
                onPressed: onClear,
                icon: const Icon(LucideIcons.x),
              ),
          ],
        ),
      ),
    );
  }
}
