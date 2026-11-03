import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'panel.dart';

/// Campo de senha no padrão do PWA: rótulo acima, dica dentro e olho para
/// mostrar o texto.
class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    this.label = 'Senha',
    this.hint = 'Digite sua senha',
    this.validator,
    this.textInputAction,
    this.onSubmitted,
    this.autofillHints = const [AutofillHints.password],
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final FormFieldValidator<String>? validator;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final Iterable<String> autofillHints;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _hidden = true;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: widget.label,
      child: TextFormField(
        controller: widget.controller,
        obscureText: _hidden,
        enableSuggestions: false,
        autocorrect: false,
        autofillHints: widget.autofillHints,
        textInputAction: widget.textInputAction,
        onFieldSubmitted: widget.onSubmitted,
        validator: widget.validator,
        decoration: InputDecoration(
          hintText: widget.hint,
          suffixIcon: IconButton(
            tooltip: _hidden ? 'Mostrar senha' : 'Ocultar senha',
            iconSize: 16,
            icon: Icon(_hidden ? LucideIcons.eye : LucideIcons.eyeOff),
            onPressed: () => setState(() => _hidden = !_hidden),
          ),
        ),
      ),
    );
  }
}
