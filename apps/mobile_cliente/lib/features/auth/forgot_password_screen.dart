import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../../shared/ui.dart';
import 'login_screen.dart';

/// Recuperar senha no mesmo cartão da entrada.
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
    return AuthCardScaffold(
      title: 'Recuperar senha',
      subtitle: 'Acesso do cliente. Use o e-mail informado no cadastro.',
      onBack: () => Navigator.of(context).maybePop(),
      child: _sent
          ? const NoticeBox(
              icon: LucideIcons.mailCheck,
              tone: StatusTone.success,
              child: Text(
                'Se este e-mail tiver cadastro, enviamos um link para criar '
                'uma nova senha. Confira também o spam.',
              ),
            )
          : Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  LabeledField(
                    label: 'Email',
                    child: TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      autofillHints: const [AutofillHints.email],
                      decoration: iconInput(LucideIcons.mail, 'seu@email.com'),
                      validator: (v) => (v ?? '').contains('@')
                          ? null
                          : 'Informe um e-mail válido',
                    ),
                  ),
                  const SizedBox(height: 24),
                  BusyButton(
                    label: 'Enviar link de recuperação',
                    busy: _busy,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
    );
  }
}
