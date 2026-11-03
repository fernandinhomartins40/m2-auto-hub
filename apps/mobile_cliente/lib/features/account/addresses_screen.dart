import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../auth/auth_controller.dart';

class AddressesScreen extends ConsumerWidget {
  const AddressesScreen({super.key});

  Future<void> _change(
    BuildContext context,
    WidgetRef ref,
    Future<void> Function() action,
    String success,
  ) async {
    await runAction(
      context,
      () async {
        await action();
        await ref.read(authControllerProvider.notifier).refresh();
      },
      success: success,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addresses =
        ref.watch(authControllerProvider).customer?.addresses ?? const [];
    final api = ref.read(apiProvider);

    void openForm([Address? address]) => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => _AddressForm(address: address)),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Endereços')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: openForm,
        icon: const Icon(Icons.add),
        label: const Text('Adicionar'),
      ),
      body: addresses.isEmpty
          ? const Center(
              child: EmptyState(
                icon: Icons.place_outlined,
                message: 'Nenhum endereço cadastrado.',
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: addresses.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final address = addresses[index];
                return Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ListTile(
                        title: Row(
                          children: [
                            Text(address.typeLabel),
                            if (address.isDefault) ...[
                              const SizedBox(width: 8),
                              const StatusChip(
                                'Padrão',
                                tone: StatusTone.info,
                              ),
                            ],
                          ],
                        ),
                        subtitle: Text(
                          '${address.line}\nCEP ${address.zipCode}',
                        ),
                        onTap: () => openForm(address),
                      ),
                      OverflowBar(
                        alignment: MainAxisAlignment.end,
                        children: [
                          if (!address.isDefault)
                            TextButton(
                              onPressed: () => _change(
                                context,
                                ref,
                                () => api.setDefaultAddress(address.id),
                                'Endereço padrão alterado',
                              ),
                              child: const Text('Tornar padrão'),
                            ),
                          TextButton(
                            onPressed: () async {
                              final accepted = await confirm(
                                context,
                                title: 'Excluir endereço?',
                                message: address.line,
                                confirmLabel: 'Excluir',
                                destructive: true,
                              );
                              if (accepted && context.mounted) {
                                await _change(
                                  context,
                                  ref,
                                  () => api.deleteAddress(address.id),
                                  'Endereço excluído',
                                );
                              }
                            },
                            child: const Text('Excluir'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

class _AddressForm extends ConsumerStatefulWidget {
  const _AddressForm({this.address});

  final Address? address;

  @override
  ConsumerState<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends ConsumerState<_AddressForm> {
  final _formKey = GlobalKey<FormState>();
  late String _type = widget.address?.type ?? 'HOME';
  late final _zip = TextEditingController(text: widget.address?.zipCode);
  late final _street = TextEditingController(text: widget.address?.street);
  late final _number = TextEditingController(text: widget.address?.number);
  late final _complement =
      TextEditingController(text: widget.address?.complement);
  late final _neighborhood =
      TextEditingController(text: widget.address?.neighborhood);
  late final _city = TextEditingController(text: widget.address?.city);
  late final _state = TextEditingController(text: widget.address?.state);
  bool _busy = false;

  @override
  void dispose() {
    _zip.dispose();
    _street.dispose();
    _number.dispose();
    _complement.dispose();
    _neighborhood.dispose();
    _city.dispose();
    _state.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final complement = _complement.text.trim();
    final done = await runAction(
      context,
      () async {
        await ref.read(apiProvider).saveAddress(widget.address?.id, {
          'type': _type,
          'zipCode': digitsOnly(_zip.text),
          'street': _street.text.trim(),
          'number': _number.text.trim(),
          if (complement.isNotEmpty) 'complement': complement,
          'neighborhood': _neighborhood.text.trim(),
          'city': _city.text.trim(),
          'state': _state.text.trim().toUpperCase(),
        });
        await ref.read(authControllerProvider.notifier).refresh();
      },
      success: 'Endereço salvo',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    String? required(String? value) =>
        (value ?? '').trim().isEmpty ? 'Campo obrigatório' : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.address == null ? 'Novo endereço' : 'Editar endereço'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'HOME', label: Text('Casa')),
                ButtonSegment(value: 'WORK', label: Text('Trabalho')),
                ButtonSegment(value: 'OTHER', label: Text('Outro')),
              ],
              selected: {_type},
              onSelectionChanged: (value) =>
                  setState(() => _type = value.first),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _zip,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'CEP'),
              validator: (v) =>
                  digitsOnly(v ?? '').length == 8 ? null : 'CEP inválido',
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _street,
              decoration: const InputDecoration(labelText: 'Rua'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _number,
              decoration: const InputDecoration(labelText: 'Número'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _complement,
              decoration: const InputDecoration(
                labelText: 'Complemento (opcional)',
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _neighborhood,
              decoration: const InputDecoration(labelText: 'Bairro'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _city,
              decoration: const InputDecoration(labelText: 'Cidade'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _state,
              maxLength: 2,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'UF'),
              validator: (v) =>
                  (v ?? '').trim().length == 2 ? null : 'Informe a UF',
            ),
            const SizedBox(height: 12),
            BusyButton(label: 'Salvar', busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
