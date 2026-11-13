import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';

/// Recuperação de senha no mesmo cartão de vidro da entrada.
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
    return PanelScaffold(
      login: true,
      appBar: AppBar(backgroundColor: Colors.transparent),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: GlassCard(
              radius: 24,
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _sent ? LucideIcons.mailCheck : LucideIcons.keyRound,
                          size: 28,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Recuperar senha',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _sent
                          ? 'Se houver uma conta ativa com este e-mail, '
                              'enviamos as instruções. Confira também o spam.'
                          : 'Informe o e-mail usado para entrar no painel.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                    if (!_sent) ...[
                      const SizedBox(height: 28),
                      LabeledField(
                        label: 'Email',
                        child: TextFormField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          autofillHints: const [AutofillHints.email],
                          decoration: const InputDecoration(
                            hintText: 'admin@m2centerauto.com.br',
                          ),
                          validator: (v) => (v ?? '').contains('@')
                              ? null
                              : 'Informe um e-mail válido',
                        ),
                      ),
                      const SizedBox(height: 24),
                      BusyButton(
                        label: 'Enviar link de recuperação',
                        icon: LucideIcons.mail,
                        busy: _busy,
                        onPressed: _submit,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
