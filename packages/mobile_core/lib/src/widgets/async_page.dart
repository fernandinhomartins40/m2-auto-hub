import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../api/api_exception.dart';
import '../theme/app_theme.dart';
import 'feedback.dart';

/// Lista com "puxar para atualizar" e os três estados de uma tela de dados.
///
/// Mantém o conteúdo anterior durante a atualização: a lista não pisca a cada
/// retorno de tela, e um erro de rede não apaga o que já estava visível.
class AsyncPage<T> extends StatelessWidget {
  const AsyncPage({
    super.key,
    required this.value,
    required this.onRefresh,
    required this.builder,
    this.isEmpty,
    this.emptyIcon = LucideIcons.inbox,
    this.emptyMessage = 'Nada por aqui ainda.',
    this.emptyAction,
    this.padding = const EdgeInsets.fromLTRB(16, 20, 16, 24),
    this.header = const [],
  });

  /// Itens fixos no topo da lista (abas, cabeçalho de seção), visíveis também
  /// enquanto carrega, quando vazio e no erro, como nos painéis do PWA.
  final List<Widget> header;

  final AsyncValue<T> value;
  final Future<void> Function() onRefresh;

  /// Itens da lista, espaçados e roláveis pela própria página.
  final List<Widget> Function(T data) builder;
  final bool Function(T data)? isEmpty;
  final IconData emptyIcon;
  final String emptyMessage;
  final Widget? emptyAction;
  final EdgeInsets padding;

  /// O erro vira aviso: a lista anterior continua na tela.
  Future<void> _refresh(BuildContext context) async {
    try {
      await onRefresh();
    } catch (error) {
      if (context.mounted) {
        showMessage(context, friendlyError(error), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (header.isNotEmpty) return _withHeader(context);
    if (value.hasValue) {
      final data = value.requireValue;
      final empty = isEmpty?.call(data) ?? false;
      return RefreshIndicator(
        onRefresh: () => _refresh(context),
        child: empty
            ? _CenteredScroll(
                child: EmptyState(
                  icon: emptyIcon,
                  message: emptyMessage,
                  action: emptyAction,
                ),
              )
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: padding,
                children: _spaced(builder(data)),
              ),
      );
    }
    if (value.hasError) {
      return RefreshIndicator(
        onRefresh: () => _refresh(context),
        child: _CenteredScroll(
          child: ErrorState(
            message: friendlyError(value.error),
            onRetry: () => _refresh(context),
          ),
        ),
      );
    }
    return const Center(child: CircularProgressIndicator());
  }

  Widget _withHeader(BuildContext context) {
    final List<Widget> body;
    if (value.hasValue) {
      final data = value.requireValue;
      body = (isEmpty?.call(data) ?? false)
          ? [
              EmptyState(
                icon: emptyIcon,
                message: emptyMessage,
                action: emptyAction,
              ),
            ]
          : builder(data);
    } else if (value.hasError) {
      body = [
        ErrorState(
          message: friendlyError(value.error),
          onRetry: () => _refresh(context),
        ),
      ];
    } else {
      body = const [
        Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }
    return RefreshIndicator(
      onRefresh: () => _refresh(context),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: padding,
        children: _spaced([...header, ...body]),
      ),
    );
  }

  List<Widget> _spaced(List<Widget> items) {
    return [
      for (var i = 0; i < items.length; i++) ...[
        if (i > 0) const SizedBox(height: 16),
        items[i],
      ],
    ];
  }
}

class _CenteredScroll extends StatelessWidget {
  const _CenteredScroll({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(child: child),
          ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: const Color(0xFF9CA3AF)),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.mutedForeground),
          ),
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: LucideIcons.cloudOff,
      message: message,
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const Icon(LucideIcons.refreshCw),
        label: const Text('Tentar novamente'),
      ),
    );
  }
}

/// Título de seção dentro de uma lista.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(title, style: Theme.of(context).textTheme.titleLarge),
    );
  }
}

/// Linha "rótulo: valor" dos cards de detalhe.
class InfoRow extends StatelessWidget {
  const InfoRow(this.label, this.value, {super.key, this.emphasized = false});

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: emphasized
                  ? theme.textTheme.titleMedium
                  : theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
