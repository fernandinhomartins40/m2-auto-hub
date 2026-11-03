import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../auth/auth_controller.dart';

class RequestQuoteScreen extends ConsumerStatefulWidget {
  const RequestQuoteScreen({super.key});

  @override
  ConsumerState<RequestQuoteScreen> createState() => _RequestQuoteScreenState();
}

class _RequestQuoteScreenState extends ConsumerState<RequestQuoteScreen> {
  final _search = TextEditingController();
  final _notes = TextEditingController();
  final Map<String, int> _selected = {};
  bool _busy = false;

  @override
  void dispose() {
    _search.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final addresses =
        ref.read(authControllerProvider).customer?.addresses ?? const [];
    final address = addresses.where((item) => item.isDefault).firstOrNull ??
        addresses.firstOrNull;
    final notes = _notes.text.trim();

    setState(() => _busy = true);
    final done = await runAction(
      context,
      () => ref.read(apiProvider).requestQuote(
            quantityByService: _selected,
            addressId: address?.id,
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
    return Scaffold(
      appBar: AppBar(title: const Text('Pedir orçamento')),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: BusyButton(
            label: _selected.isEmpty
                ? 'Escolha ao menos um serviço'
                : 'Solicitar (${_selected.length})',
            busy: _busy,
            onPressed: _selected.isEmpty ? null : _submit,
          ),
        ),
      ),
      body: AsyncPage<List<ServiceOption>>(
        value: ref.watch(servicesProvider),
        onRefresh: () => ref.refresh(servicesProvider.future),
        builder: (services) => [
          TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Buscar serviço',
              prefixIcon: Icon(Icons.search),
            ),
          ),
          for (final service in _filter(services))
            Card(
              child: ListTile(
                title: Text(service.name),
                subtitle: Text(
                  service.basePrice == null
                      ? service.category
                      : '${service.category} · a partir de '
                          '${formatMoney(service.basePrice!)}',
                ),
                trailing: _Quantity(
                  quantity: _selected[service.id] ?? 0,
                  onChanged: (value) => _setQuantity(service.id, value),
                ),
              ),
            ),
          TextField(
            controller: _notes,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Observações (opcional)',
              hintText: 'Conte o que está acontecendo com o veículo',
            ),
          ),
        ],
      ),
    );
  }
}

class _Quantity extends StatelessWidget {
  const _Quantity({required this.quantity, required this.onChanged});

  final int quantity;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    if (quantity == 0) {
      return IconButton(
        tooltip: 'Adicionar',
        icon: const Icon(Icons.add_circle_outline),
        onPressed: () => onChanged(1),
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Diminuir',
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: () => onChanged(quantity - 1),
        ),
        Text('$quantity'),
        IconButton(
          tooltip: 'Aumentar',
          icon: const Icon(Icons.add_circle_outline),
          onPressed: () => onChanged(quantity + 1),
        ),
      ],
    );
  }
}
