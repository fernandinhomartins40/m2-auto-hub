import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:m2_core/m2_core.dart';

import '../../shared/links.dart';
import '../../shared/ui.dart';
import 'auth_controller.dart';

/// Área do Cliente M2 (`CustomerAuthCard` do PWA): cartão de vidro com as
/// abas Entrar e Cadastrar.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.register = false});

  final bool register;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late int _tab = widget.register ? 1 : 0;

  @override
  Widget build(BuildContext context) {
    return AuthCardScaffold(
      title: 'Área do Cliente M2',
      subtitle: 'Entre para acompanhar pedidos, veículos e revisões',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          WorkspaceTabs(
            expand: true,
            tabs: const [WorkspaceTab('Entrar'), WorkspaceTab('Cadastrar')],
            index: _tab,
            onChanged: (index) => setState(() => _tab = index),
          ),
          const SizedBox(height: 24),
          if (_tab == 0) const _LoginForm() else const _RegisterForm(),
        ],
      ),
    );
  }
}

/// Fundo `.liquid-login` com o cartão centralizado.
class AuthCardScaffold extends StatelessWidget {
  const AuthCardScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.onBack,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return PanelScaffold(
      login: true,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: DecoratedBox(
                decoration: glassDecoration(radius: 28, opacity: 0.7).copyWith(
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.ink.withValues(alpha: 0.45),
                      offset: const Offset(0, 28),
                      blurRadius: 70,
                      spreadRadius: -34,
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (onBack != null)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: IconButton(
                            tooltip: 'Voltar',
                            onPressed: onBack,
                            icon: const Icon(LucideIcons.arrowLeft, size: 20),
                          ),
                        ),
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        subtitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 20),
                      child,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FormTitle extends StatelessWidget {
  const _FormTitle(this.title, this.subtitle);

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginForm extends ConsumerStatefulWidget {
  const _LoginForm();

  @override
  ConsumerState<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends ConsumerState<_LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _identifier.dispose();
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
          .login(_identifier.text.trim(), _password.text),
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return AutofillGroup(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _FormTitle('Fazer Login', 'Entre com seu telefone ou e-mail e senha'),
            LabeledField(
              label: 'Telefone ou e-mail',
              child: TextFormField(
                controller: _identifier,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.username],
                autocorrect: false,
                decoration: iconInput(LucideIcons.phone, '(11) 99999-9999'),
                validator: (v) => (v ?? '').trim().isEmpty
                    ? 'Informe seu telefone ou e-mail'
                    : null,
              ),
            ),
            const SizedBox(height: 16),
            PasswordField(
              controller: _password,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
              validator: (v) => (v ?? '').isEmpty ? 'Informe sua senha' : null,
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  textStyle: const TextStyle(
                    fontFamily: AppTheme.bodyFont,
                    fontSize: 14,
                    decoration: TextDecoration.underline,
                  ),
                ),
                onPressed: () => context.push('/recuperar-senha'),
                child: const Text('Recuperar senha por e-mail'),
              ),
            ),
            const SizedBox(height: 24),
            BusyButton(label: 'Entrar', busy: _busy, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}

class _RegisterForm extends ConsumerStatefulWidget {
  const _RegisterForm();

  @override
  ConsumerState<_RegisterForm> createState() => _RegisterFormState();
}

class _RegisterFormState extends ConsumerState<_RegisterForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _cpf = TextEditingController();
  final _password = TextEditingController();
  final _repeat = TextEditingController();
  bool _accepted = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _cpf.dispose();
    _password.dispose();
    _repeat.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_accepted) {
      showMessage(context, 'Leia e aceite o aviso de privacidade', error: true);
      return;
    }
    final cpf = digitsOnly(_cpf.text);
    setState(() => _busy = true);
    await runAction(
      context,
      () => ref.read(authControllerProvider.notifier).register(
            name: _name.text.trim(),
            email: _email.text.trim(),
            phone: digitsOnly(_phone.text),
            password: _password.text,
            cpf: cpf.isEmpty ? null : cpf,
          ),
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return AutofillGroup(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _FormTitle(
              'Criar Conta',
              'Cadastre-se para acompanhar seus pedidos e muito mais',
            ),
            LabeledField(
              label: 'Nome Completo *',
              child: TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                decoration: iconInput(LucideIcons.user, 'Seu nome completo'),
                validator: (v) => (v ?? '').trim().length < 3
                    ? 'Informe seu nome completo'
                    : null,
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Email *',
              child: TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autocorrect: false,
                autofillHints: const [AutofillHints.email],
                decoration: iconInput(LucideIcons.mail, 'seu@email.com'),
                validator: (v) =>
                    (v ?? '').contains('@') ? null : 'Informe um e-mail válido',
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Telefone *',
              child: TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.telephoneNumber],
                decoration: iconInput(LucideIcons.phone, '(11) 99999-9999'),
                validator: (v) {
                  final digits = digitsOnly(v ?? '').length;
                  return digits == 10 || digits == 11
                      ? null
                      : 'Informe DDD e número';
                },
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'CPF',
              child: TextFormField(
                controller: _cpf,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: iconInput(LucideIcons.creditCard, '000.000.000-00'),
                validator: (v) {
                  final digits = digitsOnly(v ?? '').length;
                  return digits == 0 || digits == 11 ? null : 'CPF inválido';
                },
              ),
            ),
            const Divider(height: 32),
            PasswordField(
              controller: _password,
              label: 'Senha *',
              hint: 'Crie uma senha forte',
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) => passwordProblem(v ?? ''),
            ),
            const SizedBox(height: 6),
            const Text(
              'Mínimo de 8 caracteres, com maiúscula, minúscula, número e '
              'caractere especial.',
              style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
            ),
            const SizedBox(height: 16),
            PasswordField(
              controller: _repeat,
              label: 'Confirmar Senha *',
              hint: 'Digite a senha novamente',
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) =>
                  v == _password.text ? null : 'As senhas não coincidem',
            ),
            const SizedBox(height: 12),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _accepted,
              onChanged: (value) => setState(() => _accepted = value ?? false),
              title: const Text(
                'Li e aceito o aviso de privacidade',
                style: TextStyle(fontSize: 14),
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                style: TextButton.styleFrom(padding: EdgeInsets.zero),
                onPressed: () => openPrivacyNotice(context),
                child: const Text('Ler aviso de privacidade'),
              ),
            ),
            const SizedBox(height: 16),
            BusyButton(label: 'Criar Conta', busy: _busy, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}
