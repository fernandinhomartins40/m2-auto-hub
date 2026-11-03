import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';
import 'item_picker_screen.dart';
import 'plate_lookup_screen.dart';

/// Assistente de OS em três etapas (`ServiceOrderModal` do PWA): cliente e
/// veículo, itens, e finalização. Cria uma OS nova ou edita uma existente.
class OrderFormScreen extends ConsumerStatefulWidget {
  const OrderFormScreen({super.key, this.order, this.lookup});

  final ServiceOrder? order;

  /// Resultado da criação rápida por placa.
  final PlateLookup? lookup;

  @override
  ConsumerState<OrderFormScreen> createState() => _OrderFormScreenState();
}

const _stepTitles = ['Cliente e Veículo', 'Itens da OS', 'Mecânico e Finalização'];

class _OrderFormScreenState extends ConsumerState<OrderFormScreen> {
  late final ServiceOrder? _order = widget.order;
  int _step = 1;
  bool _busy = false;

  // Etapa 1
  final _customerSearch = TextEditingController();
  Timer? _debounce;
  List<CustomerRef> _results = const [];
  bool _searching = false;
  CustomerRef? _customer;
  List<VehicleRef> _vehicles = const [];
  String? _vehicleId;
  late final _vehicle = TextEditingController(text: _order?.vehicleLabel);
  late final _plate = TextEditingController(text: _order?.vehiclePlate);
  late final _mileage =
      TextEditingController(text: _order?.mileage?.toString());
  late final _description = TextEditingController(text: _order?.description);

  // Etapa 2
  late final List<OrderItem> _items = [...?_order?.items];
  final _itemSearch = TextEditingController();
  int _catalogTab = 0;

  // Etapa 3
  late final _notes = TextEditingController(text: _order?.internalNotes);
  late final _discount = TextEditingController(
    text: (_order?.discount ?? 0) > 0 ? _order!.discount.toStringAsFixed(2) : '',
  );

  @override
  void initState() {
    super.initState();
    final order = _order;
    if (order != null) {
      _customer = CustomerRef(
        id: order.customerId ?? '',
        name: order.customerName,
        phone: order.customerPhone,
      );
      _vehicleId = order.vehicleId;
      if ((order.customerId ?? '').isNotEmpty) {
        _loadVehicles(order.customerId!);
      }
    }
    final lookup = widget.lookup;
    if (lookup != null) _applyLookup(lookup);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _customerSearch.dispose();
    _vehicle.dispose();
    _plate.dispose();
    _mileage.dispose();
    _description.dispose();
    _itemSearch.dispose();
    _notes.dispose();
    _discount.dispose();
    super.dispose();
  }

  String? _text(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  double get _labor => _items
      .where((i) => !i.isProduct)
      .fold(0, (sum, item) => sum + item.subtotal);
  double get _parts => _items
      .where((i) => i.isProduct)
      .fold(0, (sum, item) => sum + item.subtotal);
  double get _discountValue =>
      double.tryParse(_discount.text.replaceAll(',', '.')) ?? 0;
  double get _total =>
      (_labor + _parts - _discountValue).clamp(0, double.infinity).toDouble();

  // ---- Cliente ----

  void _onSearch(String term) {
    _debounce?.cancel();
    if (term.trim().length < 2) {
      setState(() => _results = const []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      setState(() => _searching = true);
      try {
        final results = await ref.read(apiProvider).searchCustomers(term.trim());
        if (mounted) setState(() => _results = results);
      } catch (error) {
        if (mounted) showMessage(context, friendlyError(error), error: true);
      } finally {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  Future<void> _loadVehicles(String customerId) async {
    try {
      final vehicles = await ref.read(apiProvider).customerVehicles(customerId);
      if (mounted) setState(() => _vehicles = vehicles);
    } catch (_) {
      // A lista é só um atalho: sem ela, o mecânico digita o veículo.
    }
  }

  void _selectCustomer(CustomerRef customer) {
    setState(() {
      _customer = customer;
      _results = const [];
      _vehicles = const [];
      _customerSearch.clear();
    });
    if (customer.id.isNotEmpty) _loadVehicles(customer.id);
  }

  void _clearCustomer() {
    setState(() {
      _customer = null;
      _vehicles = const [];
      _vehicleId = null;
    });
  }

  void _selectVehicle(VehicleRef vehicle) {
    setState(() {
      _vehicleId = vehicle.id;
      _vehicle.text = vehicle.label;
      _plate.text = vehicle.plate;
      if (vehicle.mileage != null) _mileage.text = '${vehicle.mileage}';
    });
    showMessage(context, 'Veículo selecionado · ${vehicle.plate}');
  }

  void _applyLookup(PlateLookup lookup) {
    if (lookup.plate.isNotEmpty) _plate.text = lookup.plate;
    final vehicle = lookup.vehicle;
    if (vehicle != null) {
      _vehicleId = vehicle.id.isEmpty ? null : vehicle.id;
      _vehicle.text = vehicle.label;
      if (vehicle.mileage != null) _mileage.text = '${vehicle.mileage}';
    } else if (lookup.vehicleLabel != null) {
      _vehicle.text = lookup.vehicleLabel!;
    }
    final customer = lookup.customer;
    if (customer != null) {
      _customer = customer;
      if (customer.id.isNotEmpty) _loadVehicles(customer.id);
    }
  }

  Future<void> _readPlate() async {
    final lookup = await Navigator.of(context).push<PlateLookup>(
      MaterialPageRoute(builder: (_) => const PlateLookupScreen()),
    );
    if (lookup == null || !mounted) return;
    setState(() => _applyLookup(lookup));
    if (lookup.vehicle != null) {
      showMessage(context, 'Veículo identificado pela placa');
    }
  }

  Future<void> _registerCustomer() async {
    final customer = await showModalBottomSheet<CustomerRef>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _CustomerSheet(),
    );
    if (customer != null && mounted) {
      _selectCustomer(customer);
      showMessage(context, 'Cliente cadastrado e vinculado à OS');
    }
  }

  // ---- Itens ----

  void _addItem(OrderItem item) {
    final duplicate = _items.any(
      (i) =>
          (item.productId != null && i.productId == item.productId) ||
          (item.serviceId != null && i.serviceId == item.serviceId),
    );
    if (duplicate) {
      showMessage(context, 'Item já adicionado', error: true);
      return;
    }
    setState(() => _items.add(item));
    showMessage(context, 'Item adicionado · ${item.name}');
  }

  Future<void> _addManual() async {
    final item = await showModalBottomSheet<OrderItem>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const ManualItemSheet(),
    );
    if (item != null) setState(() => _items.add(item));
  }

  void _changeQuantity(int index, int delta) {
    final item = _items[index];
    final quantity = item.quantity + delta;
    if (quantity < 1) return;
    setState(() => _items[index] = item.copyWith(quantity: quantity));
  }

  // ---- Navegação e salvamento ----

  void _next() {
    if (_step == 1 && (_customer?.name ?? '').trim().isEmpty) {
      showMessage(
        context,
        'Informe o cliente: selecione ou cadastre um cliente.',
        error: true,
      );
      return;
    }
    if (_step == 2) {
      if (_items.isEmpty) {
        showMessage(
          context,
          'Nenhum item: adicione ao menos um serviço ou produto.',
          error: true,
        );
        return;
      }
      if (_items.any((i) => i.name.trim().isEmpty)) {
        showMessage(context, 'Preencha o nome de todos os itens.', error: true);
        return;
      }
    }
    setState(() => _step++);
  }

  void _back() {
    if (_step == 1) {
      Navigator.of(context).pop();
    } else {
      setState(() => _step--);
    }
  }

  Future<void> _save() async {
    final api = ref.read(apiProvider);
    final customer = _customer!;
    final data = <String, dynamic>{
      'customerId': customer.id.isEmpty ? null : customer.id,
      'vehicleId': _vehicleId,
      'customerName': customer.name.trim(),
      'customerPhone': customer.phone,
      'vehicleLabel': _text(_vehicle),
      'vehiclePlate': _text(_plate) == null ? null : normalizePlate(_plate.text),
      'mileage': int.tryParse(_mileage.text.trim()),
      'description': _text(_description),
      'internalNotes': _text(_notes),
      'discount': _discountValue,
      'items': [for (final item in _items) item.toJson()],
    };

    setState(() => _busy = true);
    final order = _order;
    final done = await runAction(
      context,
      () {
        if (order != null) return api.updateOrder(order.id, data);
        // A lista do app mostra só as OS atribuídas a quem está logado.
        data['assignedMechanicId'] = ref.read(mechanicIdProvider);
        return api.createOrder(data);
      },
      success: order == null ? 'OS criada!' : 'OS atualizada!',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(orderBoardProvider);
      if (order != null) ref.invalidate(orderProvider(order.id));
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final title =
        _order == null ? 'Nova Ordem de Serviço' : 'Editar OS #${_order.number}';
    return PopScope(
      canPop: _step == 1,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _step--);
      },
      child: PanelScaffold(
        appBar: PanelAppBar(
          title: title,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(56),
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                children: [
                  StepDots(step: _step, total: 3),
                  const SizedBox(height: 6),
                  Text(
                    _stepTitles[_step - 1],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primary,
                    ),
                  ),
                  Text(
                    'Etapa $_step de 3',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        bottomNavigationBar: DecoratedBox(
          decoration: frostedBarDecoration(top: false),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Row(
                children: [
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 44),
                    ),
                    onPressed: _busy ? null : _back,
                    child: Text(_step == 1 ? 'Cancelar' : 'Voltar'),
                  ),
                  const Spacer(),
                  if (_step < 3)
                    FilledButton(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 44),
                      ),
                      onPressed: _next,
                      child: const Text('Próximo'),
                    )
                  else
                    FilledButton.icon(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 44),
                      ),
                      onPressed: _busy ? null : _save,
                      icon: _busy
                          ? const SizedBox.square(
                              dimension: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(LucideIcons.wrench),
                      label: Text(
                        _busy
                            ? 'Salvando...'
                            : _order == null
                                ? 'Criar OS'
                                : 'Salvar alterações',
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: switch (_step) {
            1 => _customerStep(),
            2 => _itemsStep(),
            _ => _finishStep(),
          },
        ),
      ),
    );
  }

  List<Widget> _customerStep() {
    final customer = _customer;
    return [
      Row(
        children: [
          const Expanded(
            child: Text(
              'Buscar Cliente Cadastrado',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
          OutlinedButton.icon(
            style: compact(null),
            onPressed: _registerCustomer,
            icon: const Icon(LucideIcons.userPlus),
            label: const Text('Cadastrar cliente'),
          ),
        ],
      ),
      const SizedBox(height: 10),
      if (customer != null)
        _SelectedCustomer(
          customer: customer,
          vehicles: _vehicles.length,
          onClear: _clearCustomer,
        )
      else ...[
        TextField(
          controller: _customerSearch,
          onChanged: _onSearch,
          decoration: InputDecoration(
            hintText: 'Digite nome, e-mail ou telefone...',
            fillColor: Colors.white.withValues(alpha: 0.85),
            prefixIcon: const Icon(LucideIcons.search, size: 16),
            suffixIcon: _searching
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : null,
          ),
        ),
        if (_results.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                for (final result in _results)
                  ListTile(
                    dense: true,
                    leading: _Initial(result.name),
                    title: Text(result.name),
                    subtitle: Text(
                      [result.phone, result.email]
                          .whereType<String>()
                          .where((v) => v.isNotEmpty)
                          .join(' · '),
                    ),
                    onTap: () => _selectCustomer(result),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 6),
        const Text(
          'Selecione um cliente cadastrado ou clique em "Cadastrar cliente".',
          style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
        ),
      ],
      const SizedBox(height: 16),
      const Divider(),
      const SizedBox(height: 16),
      Row(
        children: [
          const Icon(LucideIcons.car, size: 16, color: AppTheme.primary),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Veículo',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
          OutlinedButton.icon(
            style: compact(null),
            onPressed: _readPlate,
            icon: const Icon(LucideIcons.camera),
            label: const Text('Ler placa'),
          ),
        ],
      ),
      if (_vehicles.isNotEmpty) ...[
        const SizedBox(height: 12),
        const Text(
          'Veículos deste cliente — toque para selecionar:',
          style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
        ),
        const SizedBox(height: 6),
        for (final vehicle in _vehicles) ...[
          _VehicleOption(
            vehicle: vehicle,
            selected: vehicle.id == _vehicleId,
            onTap: () => _selectVehicle(vehicle),
          ),
          const SizedBox(height: 6),
        ],
      ],
      const SizedBox(height: 12),
      FormInput(
        label: 'Modelo / descrição',
        controller: _vehicle,
        hint: 'Ex.: Gol 2018',
        capitalization: TextCapitalization.words,
      ),
      const SizedBox(height: 16),
      LabeledField(
        label: 'Placa',
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _plate,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(hintText: 'ABC1D23'),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox.square(
              dimension: 42,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(42, 42),
                ),
                onPressed: _readPlate,
                child: const Icon(LucideIcons.camera, size: 16),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      FormInput(
        label: 'KM',
        controller: _mileage,
        hint: '0',
        keyboardType: TextInputType.number,
      ),
      const SizedBox(height: 16),
      FormInput(
        label: 'Descrição do serviço',
        controller: _description,
        hint: 'Descreva o problema ou o serviço a ser feito...',
        maxLines: 3,
        capitalization: TextCapitalization.sentences,
      ),
    ];
  }

  List<Widget> _itemsStep() {
    final services = _catalogTab == 0;
    final term = withoutAccents(_itemSearch.text);
    bool matches(String name, String category) =>
        term.isEmpty ||
        withoutAccents(name).contains(term) ||
        withoutAccents(category).contains(term);
    final catalog = services
        ? [
            for (final s in ref.watch(servicesProvider).value ?? const <CatalogService>[])
              if (matches(s.name, s.category))
                (s.name, s.category, s.price, () => _addItem(s.toItem())),
          ]
        : [
            for (final p in ref.watch(productsProvider).value ?? const <CatalogProduct>[])
              if (matches(p.name, p.category))
                (
                  p.name,
                  '${p.category} · ${p.stock} em estoque',
                  p.price,
                  () => _addItem(p.toItem()),
                ),
          ];
    final loading = services
        ? ref.watch(servicesProvider).isLoading
        : ref.watch(productsProvider).isLoading;

    return [
      Row(
        children: [
          const Expanded(
            child: Text(
              'Adicionar Itens',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
          Text(
            '${_items.length} ${_items.length == 1 ? 'item' : 'itens'} na OS',
            style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
          ),
        ],
      ),
      const SizedBox(height: 10),
      WorkspaceTabs(
        expand: true,
        index: _catalogTab,
        onChanged: (tab) => setState(() => _catalogTab = tab),
        tabs: const [
          WorkspaceTab('Serviços', icon: LucideIcons.wrench),
          WorkspaceTab('Produtos', icon: LucideIcons.package),
        ],
      ),
      const SizedBox(height: 8),
      TextField(
        controller: _itemSearch,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          hintText: services ? 'Buscar serviços...' : 'Buscar produtos...',
          fillColor: Colors.white.withValues(alpha: 0.85),
          prefixIcon: const Icon(LucideIcons.search, size: 14),
        ),
      ),
      const SizedBox(height: 8),
      Container(
        height: 240,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.border),
        ),
        child: loading && catalog.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : catalog.isEmpty
                ? Center(
                    child: Text(
                      services
                          ? 'Nenhum serviço encontrado'
                          : 'Nenhum produto encontrado',
                      style: const TextStyle(color: AppTheme.mutedForeground),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(6),
                    itemCount: catalog.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final (name, detail, price, onTap) = catalog[index];
                      return Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(6),
                          onTap: onTap,
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      Text(
                                        detail,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.mutedForeground,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  formatMoney(price),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF2563EB),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(
                                  LucideIcons.plus,
                                  size: 18,
                                  color: Color(0xFF2563EB),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
      Align(
        alignment: Alignment.centerRight,
        child: TextButton.icon(
          onPressed: _addManual,
          icon: const Icon(LucideIcons.plus, size: 16),
          label: const Text('Item manual'),
        ),
      ),
      const Divider(),
      const SizedBox(height: 12),
      Row(
        children: [
          Expanded(
            child: Text(
              'Itens da OS (${_items.length})',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
          if (_items.isNotEmpty)
            Text(
              formatMoney(_labor + _parts),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppTheme.primary,
              ),
            ),
        ],
      ),
      const SizedBox(height: 8),
      if (_items.isEmpty)
        const DashedBox(
          child: Column(
            children: [
              Icon(LucideIcons.package, size: 32, color: Color(0xFFD1D5DB)),
              SizedBox(height: 4),
              Text(
                'Nenhum item adicionado',
                style: TextStyle(fontSize: 14, color: AppTheme.mutedForeground),
              ),
            ],
          ),
        ),
      for (var i = 0; i < _items.length; i++)
        _ItemEditor(
          key: ValueKey('${_items[i].name}#$i'),
          item: _items[i],
          onRemove: () => setState(() => _items.removeAt(i)),
          onQuantity: (delta) => _changeQuantity(i, delta),
          onPrice: (price) =>
              setState(() => _items[i] = _items[i].copyWith(unitPrice: price)),
        ),
    ];
  }

  List<Widget> _finishStep() {
    final mechanic = ref.watch(authControllerProvider).mechanic;
    final customer = _customer;
    return [
      LabeledField(
        label: 'Mecânico responsável',
        child: TextFormField(
          enabled: false,
          initialValue: mechanic?.name ?? '',
        ),
      ),
      const SizedBox(height: 16),
      FormInput(
        label: 'Observações internas',
        controller: _notes,
        hint: 'Visíveis só para a oficina...',
        maxLines: 2,
        capitalization: TextCapitalization.sentences,
      ),
      const SizedBox(height: 16),
      const Divider(),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: gray50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Row(
              children: [
                Icon(LucideIcons.clipboardList, size: 16),
                SizedBox(width: 6),
                Text(
                  'Resumo da OS',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _SummaryBox(
              label: 'Cliente',
              title: customer?.name ?? '—',
              detail: customer?.phone,
            ),
            const SizedBox(height: 8),
            _SummaryBox(
              label: 'Veículo',
              title: _vehicle.text.trim().isEmpty ? '—' : _vehicle.text.trim(),
              detail: [
                if (_plate.text.trim().isNotEmpty) _plate.text.trim(),
                if (_mileage.text.trim().isNotEmpty) '${_mileage.text.trim()} km',
              ].join(' • '),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${_items.length} ${_items.length == 1 ? 'item' : 'itens'}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  for (final item in _items)
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item.quantity}x ${item.name.isEmpty ? '(sem nome)' : item.name}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        Text(
                          formatMoney(item.subtotal),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Column(
                children: [
                  _MoneyRow('Mão de obra', formatMoney(_labor)),
                  _MoneyRow('Produtos', formatMoney(_parts)),
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Desconto',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 112,
                        child: TextField(
                          controller: _discount,
                          onChanged: (_) => setState(() {}),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontSize: 12),
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            hintText: '0,00',
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 6,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Total',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ),
                  Text(
                    formatMoney(_total),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ];
  }
}

class _Initial extends StatelessWidget {
  const _Initial(this.name, {this.color = AppTheme.primary});

  final String name;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 16,
      backgroundColor: color,
      child: Text(
        name.isEmpty ? '?' : name[0].toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// Cliente escolhido, em verde, como no PWA.
class _SelectedCustomer extends StatelessWidget {
  const _SelectedCustomer({
    required this.customer,
    required this.vehicles,
    required this.onClear,
  });

  final CustomerRef customer;
  final int vehicles;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF86EFAC)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Initial(customer.name, color: green600),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      customer.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const StatusChip('Selecionado', tone: StatusTone.success),
                  ],
                ),
                if ((customer.phone ?? '').isNotEmpty)
                  Text(
                    customer.phone!,
                    style: const TextStyle(fontSize: 13, color: gray600),
                  ),
                if (vehicles > 0)
                  Text(
                    '$vehicles veículo(s) cadastrado(s)',
                    style: const TextStyle(fontSize: 12, color: green600),
                  ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Trocar cliente',
            iconSize: 16,
            onPressed: onClear,
            icon: const Icon(LucideIcons.x),
          ),
        ],
      ),
    );
  }
}

class _VehicleOption extends StatelessWidget {
  const _VehicleOption({
    required this.vehicle,
    required this.selected,
    required this.onTap,
  });

  final VehicleRef vehicle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final details = [
      vehicle.plate,
      if ((vehicle.color ?? '').isNotEmpty) vehicle.color!,
      if (vehicle.mileage != null) '${vehicle.mileage} km',
    ].join(' • ');
    return Material(
      color: selected ? const Color(0xFFF0FDF4) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: selected ? const Color(0xFF86EFAC) : AppTheme.border,
          width: selected ? 2 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${vehicle.label}${vehicle.year == null ? '' : ' ${vehicle.year}'}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      details,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                selected ? LucideIcons.check : LucideIcons.car,
                size: 16,
                color: selected ? green600 : AppTheme.primary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Item da OS com quantidade, valor e lixeira.
class _ItemEditor extends StatefulWidget {
  const _ItemEditor({
    super.key,
    required this.item,
    required this.onRemove,
    required this.onQuantity,
    required this.onPrice,
  });

  final OrderItem item;
  final VoidCallback onRemove;
  final ValueChanged<int> onQuantity;
  final ValueChanged<double> onPrice;

  @override
  State<_ItemEditor> createState() => _ItemEditorState();
}

class _ItemEditorState extends State<_ItemEditor> {
  late final _price = TextEditingController(
    text: widget.item.unitPrice.toStringAsFixed(2),
  );

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: gray50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.6)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              StatusChip(
                item.isProduct ? 'Produto' : 'Serviço',
                tone: item.isProduct ? StatusTone.info : StatusTone.orange,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  item.name,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Remover ${item.name}',
                iconSize: 16,
                visualDensity: VisualDensity.compact,
                onPressed: widget.onRemove,
                icon: const Icon(LucideIcons.trash2, color: red600),
              ),
            ],
          ),
          Row(
            children: [
              _SquareButton(
                icon: LucideIcons.minus,
                onTap: item.quantity <= 1 ? null : () => widget.onQuantity(-1),
              ),
              SizedBox(
                width: 28,
                child: Text(
                  '${item.quantity}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              _SquareButton(
                icon: LucideIcons.plus,
                onTap: () => widget.onQuantity(1),
              ),
              const Spacer(),
              const Text(
                'R\$',
                style: TextStyle(fontSize: 10, color: AppTheme.mutedForeground),
              ),
              const SizedBox(width: 4),
              SizedBox(
                width: 88,
                child: TextField(
                  controller: _price,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontSize: 14),
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  onChanged: (value) => widget.onPrice(
                    double.tryParse(value.replaceAll(',', '.')) ?? 0,
                  ),
                  decoration: const InputDecoration(
                    fillColor: Colors.white,
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 84,
                child: Text(
                  formatMoney(item.subtotal),
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          if (item.exceedsStock)
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Icon(
                    LucideIcons.triangleAlert,
                    size: 12,
                    color: Color(0xFFD97706),
                  ),
                  SizedBox(width: 4),
                  Text(
                    'Quantidade acima do estoque disponível.',
                    style: TextStyle(fontSize: 12, color: Color(0xFFD97706)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _SquareButton extends StatelessWidget {
  const _SquareButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 32,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: const Size(32, 32),
          side: const BorderSide(color: AppTheme.border),
          foregroundColor: AppTheme.slate950,
          backgroundColor: Colors.white,
        ),
        onPressed: onTap,
        child: Icon(icon, size: 14),
      ),
    );
  }
}

class _SummaryBox extends StatelessWidget {
  const _SummaryBox({required this.label, required this.title, this.detail});

  final String label;
  final String title;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppTheme.mutedForeground),
          ),
          Text(
            title,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          ),
          if ((detail ?? '').isNotEmpty)
            Text(
              detail!,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.mutedForeground,
              ),
            ),
        ],
      ),
    );
  }
}

class _MoneyRow extends StatelessWidget {
  const _MoneyRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.mutedForeground,
              ),
            ),
          ),
          Text(value, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

/// Cadastro de cliente (`CreateCustomerModal`), usado pela etapa 1.
class _CustomerSheet extends ConsumerStatefulWidget {
  const _CustomerSheet();

  @override
  ConsumerState<_CustomerSheet> createState() => _CustomerSheetState();
}

class _CustomerSheetState extends ConsumerState<_CustomerSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _cpf = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _cpf.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    CustomerRef? created;
    await runAction(context, () async {
      created = await ref.read(apiProvider).createCustomer(
            name: _name.text.trim(),
            email: _email.text.trim(),
            phone: digitsOnly(_phone.text),
            cpf: digitsOnly(_cpf.text),
          );
    });
    if (!mounted) return;
    setState(() => _busy = false);
    if (created != null) Navigator.of(context).pop(created);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        16 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.user, size: 20, color: AppTheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Cadastrar Novo Cliente',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FormInput(
                label: 'Nome Completo *',
                controller: _name,
                hint: 'João da Silva',
                capitalization: TextCapitalization.words,
                validator: (v) =>
                    (v ?? '').trim().length < 3 ? 'Informe o nome' : null,
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Email *',
                controller: _email,
                hint: 'joao.silva@email.com',
                keyboardType: TextInputType.emailAddress,
                validator: (v) =>
                    (v ?? '').contains('@') ? null : 'Informe um e-mail válido',
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Telefone *',
                controller: _phone,
                hint: '(11) 99999-9999',
                keyboardType: TextInputType.phone,
                validator: (v) => digitsOnly(v ?? '').length < 10
                    ? 'Informe o telefone com DDD'
                    : null,
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'CPF (opcional)',
                controller: _cpf,
                hint: '000.000.000-00',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              BusyButton(
                label: 'Cadastrar cliente',
                icon: LucideIcons.userPlus,
                busy: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
