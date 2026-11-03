import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../auth/auth_controller.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _customer = ref.read(authControllerProvider).customer;
  late final _name = TextEditingController(text: _customer?.name);
  late final _email = TextEditingController(text: _customer?.email);
  late final _phone = TextEditingController(text: _customer?.phone);
  late final _cpf = TextEditingController(text: _customer?.cpf);
  final _password = TextEditingController();
  bool _busy = false;

  bool get _emailChanged =>
      _email.text.trim().toLowerCase() != (_customer?.email ?? '').toLowerCase();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _cpf.dispose();
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
          'phone': digitsOnly(_phone.text),
          'cpf': digitsOnly(_cpf.text),
          if (_emailChanged) ...{
            'email': _email.text.trim(),
            'currentPassword': _password.text,
          },
        });
        await ref.read(authControllerProvider.notifier).refresh();
      },
      success: 'Dados atualizados',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dados pessoais')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Nome completo'),
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
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Telefone com DDD'),
              validator: (v) => digitsOnly(v ?? '').length < 10
                  ? 'Informe DDD e número'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cpf,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'CPF (opcional)'),
              validator: (v) {
                final digits = digitsOnly(v ?? '').length;
                return digits == 0 || digits == 11 ? null : 'CPF inválido';
              },
            ),
            const SizedBox(height: 24),
            BusyButton(label: 'Salvar', busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
