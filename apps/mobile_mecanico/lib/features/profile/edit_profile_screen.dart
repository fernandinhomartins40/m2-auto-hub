import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../auth/auth_controller.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _mechanic = ref.read(authControllerProvider).mechanic;
  late final _name = TextEditingController(text: _mechanic?.name);
  late final _email = TextEditingController(text: _mechanic?.email);
  final _password = TextEditingController();
  bool _busy = false;

  bool get _emailChanged =>
      _email.text.trim().toLowerCase() != (_mechanic?.email ?? '').toLowerCase();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final done = await runAction(
      context,
      () async {
        await ref.read(apiProvider).updateProfile({
          'name': _name.text.trim(),
          if (_emailChanged) ...{
            'email': _email.text.trim(),
            'currentPassword': _password.text,
          },
        });
        await ref.read(authControllerProvider.notifier).refresh();
      },
      success: 'Perfil atualizado',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dados da conta')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Nome'),
              validator: (v) =>
                  (v ?? '').trim().length < 3 ? 'Informe seu nome' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'E-mail'),
              validator: (v) =>
                  (v ?? '').contains('@') ? null : 'Informe um e-mail válido',
            ),
            if (_emailChanged) ...[
              const SizedBox(height: 12),
              PasswordField(
                controller: _password,
                label: 'Senha atual (para trocar o e-mail)',
                validator: (v) =>
                    (v ?? '').isEmpty ? 'Informe a senha atual' : null,
              ),
            ],
            const SizedBox(height: 24),
            BusyButton(label: 'Salvar', busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
