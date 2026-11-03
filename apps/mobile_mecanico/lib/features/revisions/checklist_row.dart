import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';

/// Carinhas em vez de rótulos, como no PWA: o mecânico está com o celular na
/// mão, muitas vezes de luva, e reconhece a cor mais rápido do que lê a palavra.
const _options = [
  (CheckStatus.ok, 'Bom', Icons.sentiment_satisfied_alt, AppTheme.success),
  (CheckStatus.attention, 'Atenção', Icons.sentiment_neutral, AppTheme.warning),
  (
    CheckStatus.critical,
    'Crítico',
    Icons.sentiment_very_dissatisfied,
    AppTheme.danger,
  ),
];

class ChecklistRow extends StatelessWidget {
  const ChecklistRow({
    super.key,
    required this.entry,
    required this.onChanged,
    this.readOnly = false,
  });

  final CheckEntry entry;
  final ValueChanged<CheckEntry> onChanged;
  final bool readOnly;

  Future<void> _editNotes(BuildContext context) async {
    final controller = TextEditingController(text: entry.notes);
    final notes = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(entry.itemName),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(labelText: 'Observação'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (notes != null) onChanged(entry.copyWith(notes: notes));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(entry.itemName),
              if (entry.notes.isNotEmpty)
                Text(
                  entry.notes,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              Row(
                children: [
                  for (final (status, label, icon, color) in _options)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: IconButton(
                        tooltip: label,
                        iconSize: 32,
                        isSelected: entry.status == status,
                        style: IconButton.styleFrom(
                          foregroundColor: color,
                          backgroundColor: entry.status == status
                              ? color.withValues(alpha: 0.18)
                              : null,
                        ),
                        icon: Icon(icon),
                        // Tocar de novo desmarca, para corrigir um toque errado.
                        onPressed: readOnly
                            ? null
                            : () => onChanged(
                                  entry.copyWith(
                                    status: entry.status == status
                                        ? CheckStatus.notChecked
                                        : status,
                                  ),
                                ),
                      ),
                    ),
                  const Spacer(),
                  if (!readOnly)
                    IconButton(
                      tooltip: entry.notes.isEmpty
                          ? 'Adicionar observação'
                          : 'Editar observação',
                      icon: Icon(
                        entry.notes.isEmpty
                            ? Icons.note_add_outlined
                            : Icons.sticky_note_2,
                        color: scheme.primary,
                      ),
                      onPressed: () => _editNotes(context),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
