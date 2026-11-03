import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

const _flags = {
  'newRevisionAssigned': 'Nova revisão atribuída a mim',
  'revisionDeadlineReminder': 'Lembrete de prazo de revisão',
  'emailNotifications': 'Receber avisos por e-mail',
};

class PreferencesScreen extends ConsumerStatefulWidget {
  const PreferencesScreen({super.key});

  @override
  ConsumerState<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends ConsumerState<PreferencesScreen> {
  Preferences? _preferences;
  Object? _error;

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

  Future<void> _toggle(String key, bool value) async {
    final previous = _preferences!;
    final next = previous.withFlag(key, value);
    setState(() => _preferences = next);
    final saved = await runAction(
      context,
      () => ref.read(apiProvider).savePreferences(next),
    );
    if (!saved && mounted) setState(() => _preferences = previous);
  }

  @override
  Widget build(BuildContext context) {
    final preferences = _preferences;
    return Scaffold(
      appBar: AppBar(title: const Text('Preferências')),
      body: preferences == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : ErrorState(message: friendlyError(_error), onRetry: _load),
            )
          : ListView(
              children: [
                for (final entry in _flags.entries)
                  SwitchListTile(
                    title: Text(entry.value),
                    value: preferences.flag(entry.key),
                    onChanged: (value) => _toggle(entry.key, value),
                  ),
              ],
            ),
    );
  }
}
