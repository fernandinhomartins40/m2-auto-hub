import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import 'plate_lookup_repository.dart';

class PlateLookupScreen extends ConsumerStatefulWidget {
  const PlateLookupScreen({super.key});

  @override
  ConsumerState<PlateLookupScreen> createState() => _PlateLookupScreenState();
}

class _PlateLookupScreenState extends ConsumerState<PlateLookupScreen> {
  final _plateCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  PlateLookupResult? _result;

  @override
  void dispose() {
    _plateCtrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final plate = _plateCtrl.text.trim().toUpperCase();
    if (plate.isEmpty) {
      setState(() => _error = 'Informe a placa');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    FocusScope.of(context).unfocus();
    try {
      final result =
          await ref.read(plateLookupRepositoryProvider).lookup(plate);
      setState(() => _result = result);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Erro ao consultar a placa.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Consulta por Placa')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _plateCtrl,
            textCapitalization: TextCapitalization.characters,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _search(),
            inputFormatters: [
              LengthLimitingTextInputFormatter(8),
              FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9\- ]')),
            ],
            decoration: const InputDecoration(
              labelText: 'Placa',
              hintText: 'ABC1D23',
              prefixIcon: Icon(Icons.pin_outlined),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _loading ? null : _search,
            icon: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.search),
            label: const Text('Consultar'),
          ),
          const SizedBox(height: 16),
          if (_error != null)
            _ErrorBox(message: _error!)
          else if (_result != null)
            _ResultView(result: _result!),
        ],
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline,
              color: theme.colorScheme.onErrorContainer, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style:
                    TextStyle(color: theme.colorScheme.onErrorContainer)),
          ),
        ],
      ),
    );
  }
}

class _ResultView extends StatelessWidget {
  const _ResultView({required this.result});
  final PlateLookupResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (!result.found) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.search_off),
          title: Text('Nenhum veículo encontrado'),
          subtitle: Text('Placa ${result.plate} não está cadastrada.'),
        ),
      );
    }

    final v = result.vehicle ?? const {};
    final c = result.customer ?? const {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.directions_car,
                        color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text('Veículo', style: theme.textTheme.titleMedium),
                  ],
                ),
                const Divider(),
                _row('Placa', v['plate']),
                _row('Marca', v['brand']),
                _row('Modelo', v['model']),
                _row('Ano', v['year']?.toString()),
                _row('Cor', v['color']),
                _row('KM', v['mileage']?.toString()),
                _row('Chassi', v['chassisNumber']),
              ],
            ),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.person, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text('Cliente', style: theme.textTheme.titleMedium),
                  ],
                ),
                const Divider(),
                _row('Nome', c['name']),
                _row('E-mail', c['email']),
                _row('WhatsApp', c['whatsapp']),
                _row('CPF', c['cpf']),
                _row('Nível', c['level']),
                _row('Status', c['status']),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _row(String label, Object? value) {
    final text = (value == null || '$value'.isEmpty) ? '—' : '$value';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
