import 'package:flutter/material.dart';

import '../app/sections.dart';

/// Tela padrão para seções ainda não portadas para o app nativo.
class SectionPlaceholder extends StatelessWidget {
  const SectionPlaceholder({super.key, required this.section});

  final AdminSection section;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(section.label)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(section.icon,
                  size: 72, color: theme.colorScheme.primary.withValues(alpha: 0.6)),
              const SizedBox(height: 16),
              Text(
                section.label,
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Esta seção ainda será portada para o app nativo.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
