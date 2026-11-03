import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../shared/links.dart';
import 'auth_controller.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _accepted = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_accepted) {
      showMessage(context, 'Leia e aceite o aviso de privacidade', error: true);
      return;
    }
    setState(() => _busy = true);
    await runAction(
      context,
      () => ref.read(authControllerProvider.notifier).register(
            name: _name.text.trim(),
            email: _email.text.trim(),
            phone: digitsOnly(_phone.text),
            password: _password.text,
          ),
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Criar conta')),
      body: AutofillGroup(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                decoration: const InputDecoration(labelText: 'Nome completo'),
                validator: (v) => (v ?? '').trim().length < 3
                    ? 'Informe seu nome completo'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autocorrect: false,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(labelText: 'E-mail'),
                validator: (v) =>
                    (v ?? '').contains('@') ? null : 'Informe um e-mail válido',
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.telephoneNumber],
                decoration: const InputDecoration(
                  labelText: 'Telefone com DDD',
                  hintText: '43999999999',
                ),
                validator: (v) {
                  final digits = digitsOnly(v ?? '').length;
                  return digits == 10 || digits == 11
                      ? null
                      : 'Informe DDD e número';
                },
              ),
              const SizedBox(height: 12),
              PasswordField(
                controller: _password,
                autofillHints: const [AutofillHints.newPassword],
                validator: (v) => passwordProblem(v ?? ''),
              ),
              const SizedBox(height: 4),
              const Text(
                'Mínimo de 8 caracteres, com maiúscula, minúscula, número e '
                'caractere especial.',
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _accepted,
                onChanged: (value) =>
                    setState(() => _accepted = value ?? false),
                title: const Text('Li e aceito o aviso de privacidade'),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => openPrivacyNotice(context),
                  child: const Text('Ler aviso de privacidade'),
                ),
              ),
              const SizedBox(height: 16),
              BusyButton(
                label: 'Criar conta',
                busy: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
