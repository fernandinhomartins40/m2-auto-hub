import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../account/addresses_screen.dart';
import '../auth/auth_controller.dart';

/// Pedido de orçamento (`RequestQuoteModal` do PWA): catálogo de serviços,
/// endereço, itens escolhidos, observações e total estimado.
class RequestQuoteScreen extends ConsumerStatefulWidget {
  const RequestQuoteScreen({super.key});

  @override
  ConsumerState<RequestQuoteScreen> createState() => _RequestQuoteScreenState();
}

class _RequestQuoteScreenState extends ConsumerState<RequestQuoteScreen> {
  final _search = TextEditingController();
  final _notes = TextEditingController();
  final Map<String, int> _selected = {};
  String? _addressId;
  bool _busy = false;

  @override
  void dispose() {
    _search.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final notes = _notes.text.trim();
    setState(() => _busy = true);
    final done = await runAction(
      context,
      () => ref.read(apiProvider).requestQuote(
            quantityByService: _selected,
            addressId: _addressId,
            observations: notes.isEmpty ? null : notes,
          ),
      success: 'Orçamento solicitado. A oficina vai responder por aqui.',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(quotesProvider);
      Navigator.of(context).pop();
    }
  }

  List<ServiceOption> _filter(List<ServiceOption> services) {
    final term = withoutAccents(_search.text);
    if (term.isEmpty) return services;
    return services
        .where(
          (service) =>
              withoutAccents(service.name).contains(term) ||
              withoutAccents(service.category).contains(term),
        )
        .toList();
  }

  void _setQuantity(String id, int quantity) {
    setState(() {
      if (quantity <= 0) {
        _selected.remove(id);
      } else {
        _selected[id] = quantity;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final addresses =
        ref.watch(authControllerProvider).customer?.addresses ?? const [];
    _addressId ??= (addresses.where((item) => item.isDefault).firstOrNull ??
            addresses.firstOrNull)
        ?.id;
    final services = ref.watch(servicesProvider);
    final byId = {
      for (final service in services.value ?? const <ServiceOption>[])
        service.id: service,
    };
    final estimated = _selected.entries.fold<double>(
      0,
      (sum, entry) => sum + (byId[entry.key]?.basePrice ?? 0) * entry.value,
    );

    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Solicitar orçamento'),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: frostedBarDecoration(top: false),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _busy ? null : () => Navigator.of(context).pop(),
                child: const Text('Cancelar'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: BusyButton(
                  label: 'Solicitar orçamento',
                  busy: _busy,
                  onPressed: _selected.isEmpty || addresses.isEmpty
                      ? null
                      : _submit,
                ),
              ),
            ],
          ),
        ),
      ),
      body: AsyncPage<List<ServiceOption>>(
        value: services,
        onRefresh: () => ref.refresh(servicesProvider.future),
        header: [
          const PanelPageHeader(
            icon: LucideIcons.wrench,
            title: 'Solicitar Orçamento',
            description: 'Selecione os serviços desejados e envie sua '
                'solicitação para análise da loja.',
          ),
          if (addresses.isEmpty)
            NoticeBox(
              icon: LucideIcons.circleAlert,
              tone: StatusTone.warning,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Você precisa cadastrar ao menos um endereço antes de '
                    'solicitar um orçamento.',
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const AddressesScreen(),
                      ),
                    ),
                    child: const Text('Cadastrar endereço'),
                  ),
                ],
              ),
            ),
          LabeledField(
            label: 'Buscar serviços',
            child: TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: iconInput(
                LucideIcons.search,
                'Buscar por nome, categoria ou descrição',
              ),
            ),
          ),
        ],
        builder: (services) => [
          _Box(
            title: 'Catálogo de serviços',
            subtitle: 'Escolha os serviços que deseja incluir no orçamento.',
            children: [
              if (_filter(services).isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text(
                    'Nenhum serviço encontrado.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.mutedForeground),
                  ),
                ),
              for (final service in _filter(services))
                _ServiceTile(
                  service: service,
                  selected: _selected.containsKey(service.id),
                  onAdd: () => _setQuantity(
                    service.id,
                    (_selected[service.id] ?? 0) + 1,
                  ),
                ),
            ],
          ),
          _Box(
            title: 'Endereço vinculado',
            subtitle: 'O endereço será usado como referência do atendimento.',
            children: [
              if (addresses.isEmpty)
                const Text(
                  'Cadastre um endereço primeiro',
                  style: TextStyle(color: AppTheme.mutedForeground),
                )
              else
                FilterSelect<String>(
                  value: _addressId ?? addresses.first.id,
                  options: {
                    for (final address in addresses)
                      address.id:
                          '${address.street}, ${address.number} - '
                              '${address.city}/${address.state}',
                  },
                  onChanged: (value) => setState(() => _addressId = value),
                ),
            ],
          ),
          _Box(
            title: 'Itens selecionados',
            subtitle: 'Ajuste a quantidade antes de enviar.',
            children: [
              if (_selected.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text(
                    'Nenhum serviço selecionado.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ),
              for (final entry in _selected.entries)
                if (byId[entry.key] case final service?)
                  _SelectedTile(
                    service: service,
                    quantity: entry.value,
                    onChanged: (value) => _setQuantity(service.id, value),
                  ),
            ],
          ),
          LabeledField(
            label: 'Observações',
            child: TextField(
              controller: _notes,
              maxLines: 4,
              maxLength: 2000,
              decoration: const InputDecoration(
                hintText: 'Descreva o problema, detalhes do serviço ou '
                    'alguma preferência.',
              ),
            ),
          ),
          NoticeBox(
            icon: LucideIcons.mapPin,
            child: Text.rich(
              TextSpan(
                text: 'Total estimado atual: ',
                children: [
                  TextSpan(
                    text: estimated > 0 ? formatMoney(estimated) : 'Sob análise',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Box extends StatelessWidget {
  const _Box({
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < children.length; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  children[i],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.service,
    required this.selected,
    required this.onAdd,
  });

  final ServiceOption service;
  final bool selected;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final price = service.basePrice;
    final compact = ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(Size(0, 36)),
      padding: const WidgetStatePropertyAll(
        EdgeInsets.symmetric(horizontal: 12),
      ),
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  service.name,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
              const SizedBox(width: 12),
              selected
                  ? OutlinedButton.icon(
                      style: compact,
                      onPressed: onAdd,
                      icon: const Icon(LucideIcons.plus),
                      label: const Text('Adicionar mais'),
                    )
                  : FilledButton.icon(
                      style: compact,
                      onPressed: onAdd,
                      icon: const Icon(LucideIcons.plus),
                      label: const Text('Adicionar'),
                    ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 4,
            children: [
              Text(
                'Categoria: ${service.category}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.mutedForeground,
                ),
              ),
              Text(
                price != null && price > 0
                    ? 'A partir de ${formatMoney(price)}'
                    : 'Preço sob análise',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SelectedTile extends StatelessWidget {
  const _SelectedTile({
    required this.service,
    required this.quantity,
    required this.onChanged,
  });

  final ServiceOption service;
  final int quantity;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final price = service.basePrice ?? 0;
    final square = OutlinedButton.styleFrom(
      minimumSize: const Size(40, 40),
      padding: EdgeInsets.zero,
    );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.name,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(
                      service.category,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Remover',
                onPressed: () => onChanged(0),
                icon: const Icon(LucideIcons.trash2,
                    size: 16, color: AppTheme.danger),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              OutlinedButton(
                style: square,
                onPressed: () => onChanged(quantity - 1),
                child: const Icon(LucideIcons.minus, size: 16),
              ),
              SizedBox(
                width: 36,
                child: Text(
                  '$quantity',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
              OutlinedButton(
                style: square,
                onPressed: () => onChanged(quantity + 1),
                child: const Icon(LucideIcons.plus, size: 16),
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    price > 0 ? formatMoney(price * quantity) : 'Sob análise',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    price > 0 ? 'Estimativa inicial' : 'Sem preço base',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
