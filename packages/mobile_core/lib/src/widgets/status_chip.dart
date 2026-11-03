import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

enum StatusTone { neutral, info, success, warning, danger }

/// Selo de status. A cor acompanha o texto, nunca o substitui.
class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.tone = StatusTone.neutral});

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = switch (tone) {
      StatusTone.neutral => scheme.onSurfaceVariant,
      StatusTone.info => scheme.primary,
      StatusTone.success => AppTheme.success,
      StatusTone.warning => AppTheme.warning,
      StatusTone.danger => AppTheme.danger,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
