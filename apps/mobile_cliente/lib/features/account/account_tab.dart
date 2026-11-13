import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';
import 'addresses_screen.dart';
import 'notifications_screen.dart';
import 'privacy_screen.dart';

const _accountTabs = [
  WorkspaceTab('Perfil e endereços'),
  WorkspaceTab('Notificações'),
];

/// Conta: Perfil e endereços / Notificações (`CustomerProfile`,
/// `CustomerNotifications`).
class AccountTab extends StatelessWidget {
  const AccountTab({super.key, required this.tab, required this.onTab});

  final int tab;
  final ValueChanged<int> onTab;

  @override
  Widget build(BuildContext context) {
    final tabs = WorkspaceTabs(tabs: _accountTabs, index: tab, onChanged: onTab);
    return tab == 0
        ? _Profile(key: const ValueKey('profile'), tabs: tabs)
        : NotificationsList(key: const ValueKey('notifications'), tabs: tabs);
  }
}

/// Troca de senha aberta pelo menu "Mais". A API invalida o token, então a
/// sessão termina em seguida.
class ChangePasswordPage extends ConsumerWidget {
  const ChangePasswordPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final navigator = Navigator.of(context);
    return ChangePasswordScreen(
      onSubmit: (current, next) async {
        await ref.read(apiProvider).changePassword(current, next);
        navigator.pop();
        await ref.read(authControllerProvider.notifier).logout();
      },
    );
  }
}

class _Profile extends ConsumerStatefulWidget {
  const _Profile({super.key, required this.tabs});

  final Widget tabs;

  @override
  ConsumerState<_Profile> createState() => _ProfileState();
}

class _ProfileState extends ConsumerState<_Profile> {
  int _section = 0;

  @override
  Widget build(BuildContext context) {
    final customer = ref.watch(authControllerProvider).customer;
    return RefreshIndicator(
      onRefresh: () => ref.read(authControllerProvider.notifier).refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          widget.tabs,
          const SizedBox(height: 16),
          if (customer != null && !customer.emailVerified) ...[
            const VerifyEmailBox(),
            const SizedBox(height: 16),
          ],
          const PanelPageHeader(
            icon: LucideIcons.user,
            title: 'Meu perfil',
            description: 'Gerencie suas informações pessoais, segurança, '
                'endereços e privacidade',
          ),
          const SizedBox(height: 16),
          WorkspaceTabs(
            expand: true,
            tabs: const [
              WorkspaceTab('Dados Pessoais'),
              WorkspaceTab('Segurança'),
              WorkspaceTab('Endereços'),
            ],
            index: _section,
            onChanged: (index) => setState(() => _section = index),
          ),
          const SizedBox(height: 16),
          if (customer == null)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            switch (_section) {
              1 => const _SecurityCard(),
              2 => const AddressesCard(),
              _ => _PersonalCard(
                  key: ValueKey(customer.hashCode),
                  customer: customer,
                ),
            },
          const SizedBox(height: 16),
          const PrivacyCard(),
        ],
      ),
    );
  }
}

/// "Informações Pessoais": campos só de leitura até tocar em "Editar".
class _PersonalCard extends ConsumerStatefulWidget {
  const _PersonalCard({super.key, required this.customer});

  final Customer customer;

  @override
  ConsumerState<_PersonalCard> createState() => _PersonalCardState();
}

class _PersonalCardState extends ConsumerState<_PersonalCard> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController();
  late final _email = TextEditingController();
  late final _phone = TextEditingController();
  late final _cpf = TextEditingController();
  final _password = TextEditingController();
  bool _editing = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _reset();
  }

  void _reset() {
    final customer = widget.customer;
    _name.text = customer.name;
    _email.text = customer.email;
    _phone.text = customer.phone;
    _cpf.text = customer.cpf ?? '';
    _password.clear();
  }

  bool get _emailChanged =>
      _email.text.trim().toLowerCase() != widget.customer.email.toLowerCase();

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
    setState(() {
      _busy = false;
      if (done) _editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    Widget field(
      String label,
      TextEditingController controller,
      IconData icon,
      String hint, {
      TextInputType? keyboard,
      FormFieldValidator<String>? validator,
      bool enabled = true,
    }) {
      return LabeledField(
        label: label,
        child: TextFormField(
          controller: controller,
          enabled: _editing && enabled,
          keyboardType: keyboard,
          onChanged: (_) => setState(() {}),
          style: const TextStyle(fontSize: 14),
          decoration: iconInput(icon, hint),
          validator: validator,
        ),
      );
    }

    final birthDate = widget.customer.birthDate;
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CardHeading(
              icon: LucideIcons.user,
              title: 'Informações Pessoais',
              description: 'Atualize seus dados pessoais e de contato',
              trailing: _editing
                  ? OutlinedButton(
                      onPressed: () => setState(() {
                        _reset();
                        _editing = false;
                      }),
                      child: const Text('Cancelar'),
                    )
                  : FilledButton(
                      onPressed: () => setState(() => _editing = true),
                      child: const Text('Editar'),
                    ),
            ),
            const SizedBox(height: 20),
            field(
              'Nome Completo',
              _name,
              LucideIcons.user,
              'Seu nome completo',
              validator: (v) =>
                  (v ?? '').trim().length < 3 ? 'Informe seu nome' : null,
            ),
            const SizedBox(height: 16),
            field(
              'Email',
              _email,
              LucideIcons.mail,
              'seu@email.com',
              keyboard: TextInputType.emailAddress,
              validator: (v) =>
                  (v ?? '').contains('@') ? null : 'Informe um e-mail válido',
            ),
            if (_editing && _emailChanged) ...[
              const SizedBox(height: 16),
              PasswordField(
                controller: _password,
                label: 'Senha atual (para trocar o e-mail)',
                hint: 'Digite sua senha atual',
                validator: (v) =>
                    (v ?? '').isEmpty ? 'Informe a senha atual' : null,
              ),
            ],
            const SizedBox(height: 16),
            field(
              'Telefone',
              _phone,
              LucideIcons.phone,
              '(11) 99999-9999',
              keyboard: TextInputType.phone,
              validator: (v) => digitsOnly(v ?? '').length < 10
                  ? 'Informe DDD e número'
                  : null,
            ),
            const SizedBox(height: 16),
            field(
              'CPF',
              _cpf,
              LucideIcons.creditCard,
              '000.000.000-00',
              keyboard: TextInputType.number,
              validator: (v) {
                final digits = digitsOnly(v ?? '').length;
                return digits == 0 || digits == 11 ? null : 'CPF inválido';
              },
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Data de Nascimento',
              child: TextFormField(
                key: ValueKey(birthDate),
                initialValue: birthDate == null ? '' : formatDate(birthDate),
                enabled: false,
                style: const TextStyle(fontSize: 14),
                decoration: iconInput(LucideIcons.calendar, 'dd/mm/aaaa'),
              ),
            ),
            if (_editing) ...[
              const SizedBox(height: 20),
              BusyButton(
                label: 'Salvar Alterações',
                icon: LucideIcons.save,
                busy: _busy,
                onPressed: _save,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Alterar Senha" da aba Segurança.
class _SecurityCard extends ConsumerStatefulWidget {
  const _SecurityCard();

  @override
  ConsumerState<_SecurityCard> createState() => _SecurityCardState();
}

class _SecurityCardState extends ConsumerState<_SecurityCard> {
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
    final done = await runAction(
      context,
      () => ref.read(apiProvider).changePassword(_current.text, _next.text),
      success: 'Senha alterada. Entre de novo com a nova senha.',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    // A API invalida o token ao trocar a senha.
    if (done) await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const CardHeading(
              icon: LucideIcons.lock,
              title: 'Alterar Senha',
              description: 'Mantenha sua conta segura com uma senha forte',
            ),
            const SizedBox(height: 20),
            PasswordField(
              controller: _current,
              label: 'Senha Atual',
              hint: 'Digite sua senha atual',
              validator: (v) =>
                  (v ?? '').isEmpty ? 'Informe a senha atual' : null,
            ),
            const SizedBox(height: 16),
            PasswordField(
              controller: _next,
              label: 'Nova Senha',
              hint: 'Digite a nova senha',
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) => passwordProblem(v ?? ''),
            ),
            const SizedBox(height: 16),
            PasswordField(
              controller: _repeat,
              label: 'Confirmar Nova Senha',
              hint: 'Confirme a nova senha',
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) =>
                  v == _next.text ? null : 'As senhas não coincidem',
            ),
            const SizedBox(height: 20),
            BusyButton(
              label: 'Alterar Senha',
              icon: LucideIcons.lock,
              busy: _busy,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

/// Aviso do topo do perfil do PWA para quem ainda não confirmou o e-mail.
class VerifyEmailBox extends ConsumerStatefulWidget {
  const VerifyEmailBox({super.key});

  @override
  ConsumerState<VerifyEmailBox> createState() => _VerifyEmailBoxState();
}

class _VerifyEmailBoxState extends ConsumerState<VerifyEmailBox> {
  bool _sending = false;

  Future<void> _resend() async {
    setState(() => _sending = true);
    try {
      await ref.read(apiProvider).resendVerification();
      if (mounted) {
        showMessage(context, 'E-mail de confirmação enviado. Verifique '
            'também a pasta de spam.');
      }
    } catch (_) {
      if (mounted) {
        showMessage(context, 'Não foi possível enviar. Tente novamente mais '
            'tarde.', error: true);
      }
    }
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    return NoticeBox(
      icon: LucideIcons.mail,
      tone: StatusTone.neutral,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Confirme seu e-mail para manter seus dados de acesso '
              'atualizados.'),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _sending ? null : _resend,
            child: Text(_sending
                ? 'Enviando...'
                : 'Reenviar confirmação de e-mail'),
          ),
        ],
      ),
    );
  }
}
