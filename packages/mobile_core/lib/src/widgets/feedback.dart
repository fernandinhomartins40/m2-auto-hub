import 'package:flutter/material.dart';

import '../api/api_exception.dart';

void showMessage(BuildContext context, String message, {bool error = false}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: error ? Theme.of(context).colorScheme.error : null,
    ),
  );
}

/// Executa [action], avisa o resultado e devolve se deu certo.
Future<bool> runAction(
  BuildContext context,
  Future<void> Function() action, {
  String? success,
}) async {
  try {
    await action();
    if (context.mounted && success != null) showMessage(context, success);
    return true;
  } catch (error) {
    if (context.mounted) {
      showMessage(context, friendlyError(error), error: true);
    }
    return false;
  }
}

/// Confirmação de ação difícil de desfazer. Devolve `true` se confirmada.
Future<bool> confirm(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final scheme = Theme.of(context).colorScheme;
  final accepted = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Voltar'),
        ),
        TextButton(
          style: destructive
              ? TextButton.styleFrom(foregroundColor: scheme.error)
              : null,
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return accepted ?? false;
}

/// Botão principal com indicador de progresso e bloqueio durante a ação.
class BusyButton extends StatelessWidget {
  const BusyButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.icon,
    this.style,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData? icon;

  /// Troca a cor do botão (por exemplo, o verde de "Aprovar").
  final ButtonStyle? style;

  @override
  Widget build(BuildContext context) {
    final indicator = SizedBox.square(
      dimension: 20,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        color: Theme.of(context).colorScheme.onPrimary,
      ),
    );
    if (icon == null) {
      return FilledButton(
        style: style,
        onPressed: busy ? null : onPressed,
        child: busy ? indicator : Text(label),
      );
    }
    return FilledButton.icon(
      style: style,
      onPressed: busy ? null : onPressed,
      icon: busy ? indicator : Icon(icon),
      label: Text(label),
    );
  }
}
