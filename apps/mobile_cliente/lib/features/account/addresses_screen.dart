import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';

/// Endereços aberto fora da Conta (por exemplo, ao pedir orçamento).
class AddressesScreen extends StatelessWidget {
  const AddressesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Meus Endereços'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: const [AddressesCard()],
      ),
    );
  }
}

/// Cartão "Meus Endereços" da aba Endereços do perfil.
class AddressesCard extends ConsumerWidget {
  const AddressesCard({super.key});

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

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const CardHeading(
            icon: LucideIcons.mapPin,
            title: 'Meus Endereços',
            description: 'Gerencie seus endereços de entrega',
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.icon(
              onPressed: openForm,
              icon: const Icon(LucideIcons.plus),
              label: const Text('Novo Endereço'),
            ),
          ),
          const SizedBox(height: 16),
          if (addresses.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.mapPin,
                    size: 48,
                    color: AppTheme.mutedForeground.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Nenhum endereço cadastrado',
                    style: TextStyle(color: AppTheme.mutedForeground),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: openForm,
                    icon: const Icon(LucideIcons.plus),
                    label: const Text('Adicionar Primeiro Endereço'),
                  ),
                ],
              ),
            ),
          for (final address in addresses) ...[
            _AddressTile(
              address: address,
              onEdit: () => openForm(address),
              onDefault: address.isDefault
                  ? null
                  : () => _change(
                        context,
                        ref,
                        () => api.setDefaultAddress(address.id),
                        'Endereço padrão alterado',
                      ),
              onDelete: addresses.length <= 1
                  ? null
                  : () async {
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
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _AddressTile extends StatelessWidget {
  const _AddressTile({
    required this.address,
    required this.onEdit,
    required this.onDefault,
    required this.onDelete,
  });

  final Address address;
  final VoidCallback onEdit;
  final VoidCallback? onDefault;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    const muted = TextStyle(fontSize: 13, color: AppTheme.mutedForeground);
    final icon = switch (address.type) {
      'WORK' => LucideIcons.building2,
      'OTHER' => LucideIcons.mapPin,
      _ => LucideIcons.house,
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 20, color: AppTheme.mutedForeground),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      address.typeLabel,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    if (address.isDefault) ...[
                      const SizedBox(width: 8),
                      const StatusChip('Principal'),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${address.street}, ${address.number}'
                  '${(address.complement ?? '').isEmpty ? '' : ', ${address.complement}'}',
                  style: muted,
                ),
                Text(
                  '${address.neighborhood} - ${address.city}, ${address.state}',
                  style: muted,
                ),
                Text('CEP: ${address.zipCode}', style: muted),
                if (onDefault != null)
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 32),
                    ),
                    onPressed: onDefault,
                    child: const Text('Tornar principal'),
                  ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Editar endereço',
            onPressed: onEdit,
            icon: const Icon(LucideIcons.squarePen, size: 16),
          ),
          IconButton(
            tooltip: 'Excluir endereço',
            onPressed: onDelete,
            icon: const Icon(LucideIcons.trash2, size: 16),
          ),
        ],
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

    Widget field(
      String label,
      TextEditingController controller,
      String hint, {
      FormFieldValidator<String>? validator,
      TextInputType? keyboard,
      int? maxLength,
      TextCapitalization caps = TextCapitalization.words,
    }) {
      return LabeledField(
        label: label,
        child: TextFormField(
          controller: controller,
          keyboardType: keyboard,
          maxLength: maxLength,
          textCapitalization: caps,
          decoration: InputDecoration(hintText: hint, counterText: ''),
          validator: validator,
        ),
      );
    }

    Widget pair(Widget left, Widget right, {int leftFlex = 1}) => Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: leftFlex, child: left),
            const SizedBox(width: 12),
            Expanded(child: right),
          ],
        );

    final editing = widget.address != null;
    return FormPage(
      title: editing ? 'Editar Endereço' : 'Novo Endereço',
      formKey: _formKey,
      header: PanelPageHeader(
        icon: LucideIcons.mapPin,
        title: editing ? 'Editar Endereço' : 'Novo Endereço',
        description: 'Endereço usado nas entregas e como referência dos '
            'atendimentos.',
      ),
      children: [
        LabeledField(
          label: 'Tipo do Endereço',
          child: FilterSelect<String>(
            value: _type,
            options: const {
              'HOME': 'Casa',
              'WORK': 'Trabalho',
              'OTHER': 'Outro',
            },
            onChanged: (value) => setState(() => _type = value),
          ),
        ),
        pair(
          field('Rua', _street, 'Nome da rua', validator: required),
          field('Número', _number, '123', validator: required),
          leftFlex: 2,
        ),
        field('Complemento (opcional)', _complement, 'Apto, sala, etc.'),
        field('Bairro', _neighborhood, 'Nome do bairro', validator: required),
        pair(
          field('Cidade', _city, 'Cidade', validator: required),
          field(
            'Estado',
            _state,
            'SP',
            maxLength: 2,
            caps: TextCapitalization.characters,
            validator: (v) =>
                (v ?? '').trim().length == 2 ? null : 'Informe a UF',
          ),
          leftFlex: 2,
        ),
        field(
          'CEP',
          _zip,
          '00000-000',
          keyboard: TextInputType.number,
          maxLength: 9,
          validator: (v) =>
              digitsOnly(v ?? '').length == 8 ? null : 'CEP inválido',
        ),
        Row(
          children: [
            OutlinedButton(
              onPressed: _busy ? null : () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: BusyButton(
                label: editing ? 'Salvar Alterações' : 'Adicionar Endereço',
                busy: _busy,
                onPressed: _save,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
