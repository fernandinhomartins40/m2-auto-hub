import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:m2_core/m2_core.dart';

import 'auth_controller.dart';

/// Entrada igual à `AdminLoginPage` do PWA. As caixas "Salvar dados de
/// acesso" e "Manter conectado" ficam de fora: o app guarda a sessão sozinho.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    await runAction(
      context,
      () => ref
          .read(authControllerProvider.notifier)
          .login(_email.text.trim(), _password.text),
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return PanelScaffold(
      login: true,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  GlassCard(
                    radius: 24,
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                    child: AutofillGroup(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Center(child: _RoundIcon(LucideIcons.shield)),
                            const SizedBox(height: 16),
                            Text(
                              'Painel Administrativo',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Faça login para acessar o painel da loja, '
                              'oficina e equipe',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 15,
                                color: AppTheme.mutedForeground,
                              ),
                            ),
                            const SizedBox(height: 28),
                            LabeledField(
                              label: 'Email',
                              child: TextFormField(
                                controller: _email,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.username],
                                autocorrect: false,
                                decoration: const InputDecoration(
                                  hintText: 'admin@m2centerauto.com.br',
                                ),
                                validator: (v) => (v ?? '').contains('@')
                                    ? null
                                    : 'Informe seu e-mail',
                              ),
                            ),
                            const SizedBox(height: 20),
                            PasswordField(
                              controller: _password,
                              hint: '••••••••',
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => _submit(),
                              validator: (v) =>
                                  (v ?? '').isEmpty ? 'Informe sua senha' : null,
                            ),
                            const SizedBox(height: 16),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: GestureDetector(
                                onTap: () => context.push('/recuperar-senha'),
                                child: const Text(
                                  'Recuperar senha por e-mail',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AppTheme.primary,
                                    decoration: TextDecoration.underline,
                                    decorationColor: AppTheme.primary,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            BusyButton(
                              label: 'Entrar no Painel',
                              icon: LucideIcons.logIn,
                              busy: _busy,
                              onPressed: _submit,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    '© ${DateTime.now().year} M2 Center Auto',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Ícone num círculo azul claro, no topo do cartão de entrada.
class _RoundIcon extends StatelessWidget {
  const _RoundIcon(this.icon);

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 28, color: AppTheme.primary),
    );
  }
}
