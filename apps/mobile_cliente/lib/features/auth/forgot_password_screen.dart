import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final sent = await runAction(
      context,
      () => ref.read(apiProvider).forgotPassword(_email.text.trim()),
    );
    if (mounted) {
      setState(() {
        _busy = false;
        _sent = sent;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recuperar senha')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: _sent
              ? const [
                  EmptyState(
                    icon: Icons.mark_email_read_outlined,
                    message: 'Se este e-mail tiver cadastro, enviamos um link '
                        'para criar uma nova senha. Confira também o spam.',
                  ),
                ]
              : [
                  const Text(
                    'Informe o e-mail da sua conta. Enviaremos um link para '
                    'criar uma nova senha.',
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'E-mail'),
                    validator: (v) => (v ?? '').contains('@')
                        ? null
                        : 'Informe um e-mail válido',
                  ),
                  const SizedBox(height: 24),
                  BusyButton(
                    label: 'Enviar link',
                    busy: _busy,
                    onPressed: _submit,
                  ),
                ],
        ),
      ),
    );
  }
}
