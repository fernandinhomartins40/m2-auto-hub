import 'package:flutter/material.dart';

/// Faixa de contadores no topo das listas de trabalho.
class StatRow extends StatelessWidget {
  const StatRow({super.key, required this.stats});

  /// Pares de rótulo e valor.
  final List<(String, int)> stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        for (final (label, value) in stats)
          Expanded(
            child: Column(
              children: [
                Text('$value', style: theme.textTheme.headlineSmall),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelSmall,
                ),
              ],
            ),
          ),
      ],
    );
  }
}
