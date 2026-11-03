import 'package:flutter/material.dart';

import '../format.dart';
import 'feedback.dart';
import 'password_field.dart';

/// Troca de senha. Cada app informa a chamada de API em [onSubmit].
///
/// A API invalida o token ao trocar a senha, então quem chama deve encerrar a
/// sessão em seguida.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key, required this.onSubmit});

  final Future<void> Function(String current, String next) onSubmit;

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _repeat = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _repeat.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    await runAction(context, () => widget.onSubmit(_current.text, _next.text));
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alterar senha')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Depois de alterar, você entra de novo com a nova senha.'),
            const SizedBox(height: 16),
            PasswordField(
              controller: _current,
              label: 'Senha atual',
              validator: (v) => (v ?? '').isEmpty ? 'Informe a senha atual' : null,
            ),
            const SizedBox(height: 12),
            PasswordField(
              controller: _next,
              label: 'Nova senha',
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) => passwordProblem(v ?? ''),
            ),
            const SizedBox(height: 12),
            PasswordField(
              controller: _repeat,
              label: 'Repita a nova senha',
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) => v == _next.text ? null : 'As senhas não coincidem',
            ),
            const SizedBox(height: 24),
            BusyButton(label: 'Alterar senha', busy: _busy, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}
