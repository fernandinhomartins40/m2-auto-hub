import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';

/// Perfil do mecânico (`MechanicSettingsView`): cinco abas por ícone com
/// perfil, senha, estatísticas, histórico e preferências.
class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  int _tab = 0;

  static const _icons = [
    (LucideIcons.user, 'Perfil'),
    (LucideIcons.lock, 'Segurança'),
    (LucideIcons.chartColumn, 'Estatísticas'),
    (LucideIcons.history, 'Histórico'),
    (LucideIcons.bell, 'Preferências'),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      children: [
        Center(child: _IconTabs(index: _tab, onChanged: _select)),
        const SizedBox(height: 16),
        switch (_tab) {
          0 => const _ProfileSection(),
          1 => const _SecuritySection(),
          2 => const _StatsSection(),
          3 => const _ActivitySection(),
          _ => const _PreferencesSection(),
        },
        const SizedBox(height: 16),
        Center(
          child: TextButton.icon(
            onPressed: () => launchUrl(
              Uri.parse('${Env.siteUrl}/privacidade'),
              mode: LaunchMode.externalApplication,
            ),
            icon: const Icon(LucideIcons.shield, size: 16),
            label: const Text('Aviso de privacidade'),
          ),
        ),
      ],
    );
  }

  void _select(int tab) => setState(() => _tab = tab);
}

/// Abas só com ícone, em pílula (`TabsList` do perfil no celular).
class _IconTabs extends StatelessWidget {
  const _IconTabs({required this.index, required this.onChanged});

  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: glassDecoration(opacity: 0.62, radius: 16),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < _ProfileTabState._icons.length; i++)
            Tooltip(
              message: _ProfileTabState._icons[i].$2,
              child: Semantics(
                button: true,
                selected: i == index,
                label: _ProfileTabState._icons[i].$2,
                excludeSemantics: true,
                child: GestureDetector(
                  onTap: () => onChanged(i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    width: 48,
                    height: 36,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      color: i == index ? AppTheme.primary : null,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: i == index
                          ? [
                              BoxShadow(
                                color: AppTheme.primary.withValues(alpha: 0.8),
                                offset: const Offset(0, 8),
                                blurRadius: 18,
                                spreadRadius: -12,
                              ),
                            ]
                          : null,
                    ),
                    child: Icon(
                      _ProfileTabState._icons[i].$1,
                      size: 16,
                      color: i == index ? Colors.white : AppTheme.slate500,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Cartão branco das seções do perfil, com título e descrição.
class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.description,
    required this.children,
  });

  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text(
            description,
            style: const TextStyle(fontSize: 14, color: AppTheme.mutedForeground),
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }
}

class _ProfileSection extends ConsumerStatefulWidget {
  const _ProfileSection();

  @override
  ConsumerState<_ProfileSection> createState() => _ProfileSectionState();
}

class _ProfileSectionState extends ConsumerState<_ProfileSection> {
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
    await runAction(
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
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: _SectionCard(
        title: 'Informações do Perfil',
        description: 'Gerencie suas informações pessoais',
        children: [
          FormInput(
            label: 'Nome',
            controller: _name,
            capitalization: TextCapitalization.words,
            validator: (v) =>
                (v ?? '').trim().length < 3 ? 'Informe seu nome' : null,
          ),
          const SizedBox(height: 20),
          FormInput(
            label: 'Email',
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            helper: 'Este é o email usado para entrar no painel',
            onChanged: (_) => setState(() {}),
            validator: (v) =>
                (v ?? '').contains('@') ? null : 'Informe um e-mail válido',
          ),
          if (_emailChanged) ...[
            const SizedBox(height: 20),
            PasswordField(
              controller: _password,
              label: 'Senha atual',
              hint: 'Necessária para trocar o e-mail',
              validator: (v) =>
                  (v ?? '').isEmpty ? 'Informe a senha atual' : null,
            ),
          ],
          const SizedBox(height: 20),
          const Text(
            'Função',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          const Align(
            alignment: Alignment.centerLeft,
            child: StatusChip('Mecânico', tone: StatusTone.dark),
          ),
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 20),
          BusyButton(
            label: 'Salvar Alterações',
            icon: LucideIcons.save,
            busy: _busy,
            onPressed: _save,
          ),
        ],
      ),
    );
  }
}

class _SecuritySection extends ConsumerStatefulWidget {
  const _SecuritySection();

  @override
  ConsumerState<_SecuritySection> createState() => _SecuritySectionState();
}

class _SecuritySectionState extends ConsumerState<_SecuritySection> {
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

  /// A API invalida o token ao trocar a senha: a sessão termina em seguida.
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
    if (done) await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: _SectionCard(
        title: 'Alterar Senha',
        description: 'Mantenha sua conta segura com uma senha forte',
        children: [
          PasswordField(
            controller: _current,
            label: 'Senha Atual',
            hint: 'Digite sua senha atual',
            validator: (v) => (v ?? '').isEmpty ? 'Informe a senha atual' : null,
          ),
          const SizedBox(height: 20),
          PasswordField(
            controller: _next,
            label: 'Nova Senha',
            hint: 'Digite a nova senha',
            autofillHints: const [AutofillHints.newPassword],
            validator: (v) => passwordProblem(v ?? ''),
          ),
          const SizedBox(height: 20),
          PasswordField(
            controller: _repeat,
            label: 'Confirmar Nova Senha',
            hint: 'Confirme a nova senha',
            autofillHints: const [AutofillHints.newPassword],
            validator: (v) => v == _next.text ? null : 'As senhas não coincidem',
          ),
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 20),
          BusyButton(
            label: 'Alterar Senha',
            icon: LucideIcons.lock,
            busy: _busy,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}

class _StatsSection extends ConsumerWidget {
  const _StatsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(statsProvider);
    return _SectionCard(
      title: 'Estatísticas de Trabalho',
      description: 'Acompanhe seu desempenho e produtividade',
      children: [
        if (value.hasValue) ...[
          for (final (label, text, icon, color) in [
            (
              'Total de Revisões',
              '${value.requireValue.total}',
              LucideIcons.car,
              const Color(0xFF2563EB),
            ),
            (
              'Concluídas',
              '${value.requireValue.completed}',
              LucideIcons.circleCheck,
              green600,
            ),
            (
              'Em Andamento',
              '${value.requireValue.inProgress}',
              LucideIcons.clock,
              const Color(0xFFCA8A04),
            ),
            (
              'Pendentes',
              '${value.requireValue.pending}',
              LucideIcons.circleAlert,
              const Color(0xFFEA580C),
            ),
            (
              'Taxa de Conclusão',
              '${value.requireValue.completionRate.round()}%',
              LucideIcons.trendingUp,
              const Color(0xFF9333EA),
            ),
            (
              'Tempo Médio',
              value.requireValue.averageHours == null
                  ? '-'
                  : '${value.requireValue.averageHours!.toStringAsFixed(1)}h',
              LucideIcons.calendar,
              const Color(0xFF4F46E5),
            ),
          ]) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: gray50.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, size: 20, color: color),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                      Text(
                        text,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
        ] else if (value.hasError)
          ErrorState(
            message: friendlyError(value.error),
            onRetry: () => ref.refresh(statsProvider.future),
          )
        else
          const Center(child: CircularProgressIndicator()),
      ],
    );
  }
}

class _ActivitySection extends ConsumerWidget {
  const _ActivitySection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(activityProvider);
    return _SectionCard(
      title: 'Histórico de Atividades',
      description: 'Suas revisões mais recentes',
      children: [
        if (value.hasValue) ...[
          if (value.requireValue.isEmpty)
            const EmptyState(
              icon: LucideIcons.history,
              message: 'Nenhuma atividade recente',
            ),
          for (final item in value.requireValue) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 3),
                        child: Icon(LucideIcons.car, size: 14, color: gray400),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item.vehicleInfo,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Cliente: ${item.customerName}',
                    style: const TextStyle(fontSize: 14, color: gray600),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      StatusChip(
                        _activityLabel(item.status),
                        tone: StatusTone.dark,
                      ),
                      Text(
                        formatDateTime(item.date),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
        ] else if (value.hasError)
          ErrorState(
            message: friendlyError(value.error),
            onRetry: () => ref.refresh(activityProvider.future),
          )
        else
          const Center(child: CircularProgressIndicator()),
      ],
    );
  }

  static String _activityLabel(String status) => switch (status) {
        'COMPLETED' => 'Concluída',
        'IN_PROGRESS' => 'Em Andamento',
        'CANCELLED' => 'Cancelada',
        _ => 'Rascunho',
      };
}

const _flags = [
  (
    'newRevisionAssigned',
    'Nova revisão atribuída',
    'Receba um alerta quando uma nova revisão for atribuída a você',
  ),
  (
    'revisionDeadlineReminder',
    'Lembrete de prazo',
    'Receba lembretes sobre prazos de revisões',
  ),
  (
    'emailNotifications',
    'Notificações por email',
    'Receba notificações também por email',
  ),
];

const _themes = {'light': 'Claro', 'dark': 'Escuro', 'system': 'Sistema'};

class _PreferencesSection extends ConsumerStatefulWidget {
  const _PreferencesSection();

  @override
  ConsumerState<_PreferencesSection> createState() =>
      _PreferencesSectionState();
}

class _PreferencesSectionState extends ConsumerState<_PreferencesSection> {
  Preferences? _preferences;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final preferences = await ref.read(apiProvider).preferences();
      if (mounted) setState(() => _preferences = preferences);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  /// O tema vale para o painel web; o app segue sempre o tema claro do PWA.
  String get _theme =>
      (asMap(_preferences?.raw['display'])?['theme'] ?? 'system').toString();

  void _setTheme(String theme) {
    final raw = _preferences!.raw;
    setState(
      () => _preferences = Preferences({
        ...raw,
        'display': {...?asMap(raw['display']), 'theme': theme},
      }),
    );
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    await runAction(
      context,
      () => ref.read(apiProvider).savePreferences(_preferences!),
      success: 'Preferências salvas',
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final preferences = _preferences;
    return _SectionCard(
      title: 'Preferências',
      description: 'Configure notificações e preferências de exibição',
      children: preferences == null
          ? [
              Center(
                child: _error == null
                    ? const CircularProgressIndicator()
                    : ErrorState(message: friendlyError(_error), onRetry: _load),
              ),
            ]
          : [
              const Text(
                'Notificações',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 12),
              for (final (key, title, description) in _flags) ...[
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            description,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: preferences.flag(key),
                      activeTrackColor: AppTheme.primary,
                      onChanged: (value) => setState(
                        () => _preferences = preferences.withFlag(key, value),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              const Divider(),
              const SizedBox(height: 16),
              const Text(
                'Exibição',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 12),
              const Text(
                'Tema',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  for (final entry in _themes.entries)
                    entry.key == _theme
                        ? FilledButton(
                            onPressed: () => _setTheme(entry.key),
                            child: Text(entry.value),
                          )
                        : OutlinedButton(
                            onPressed: () => _setTheme(entry.key),
                            child: Text(entry.value),
                          ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              BusyButton(
                label: 'Salvar Preferências',
                icon: LucideIcons.save,
                busy: _busy,
                onPressed: _save,
              ),
            ],
    );
  }
}
