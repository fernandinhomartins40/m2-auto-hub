import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import 'order_form_screen.dart' show CustomerSheet;
import 'vehicle_sheet.dart';

/// Primeiro passo da OS: encontra cliente e veículo pela placa, digitada ou
/// lida de uma foto. Usa a câmera do sistema, sem pedir permissão de câmera.
/// Placa sem veículo: vincula a um cliente e cadastra o veículo, como o
/// `RevisionVehicleLookupDialog` do PWA.
class PlateLookupScreen extends ConsumerStatefulWidget {
  const PlateLookupScreen({super.key, this.pickPhoto = _openCamera});

  /// Abre a câmera; trocado nos testes para simular falha.
  final Future<XFile?> Function() pickPhoto;

  @override
  ConsumerState<PlateLookupScreen> createState() => _PlateLookupScreenState();
}

class _PlateLookupScreenState extends ConsumerState<PlateLookupScreen> {
  final _plate = TextEditingController();
  String? _status;
  String? _cameraError;

  // Placa ainda não cadastrada.
  PlateLookup? _unlinked;
  CustomerRef? _selected;
  final _customerSearch = TextEditingController();
  Timer? _debounce;
  List<CustomerRef> _customers = const [];
  bool _searchingCustomers = false;

  bool get _busy => _status != null;

  @override
  void dispose() {
    _debounce?.cancel();
    _plate.dispose();
    _customerSearch.dispose();
    super.dispose();
  }

  void _searchCustomers(String term) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      setState(() => _searchingCustomers = true);
      try {
        final found = await ref.read(apiProvider).searchCustomers(term.trim());
        if (mounted) setState(() => _customers = found);
      } catch (_) {
        // A lista é só um atalho: "Novo cliente" continua disponível.
      } finally {
        if (mounted) setState(() => _searchingCustomers = false);
      }
    });
  }

  Future<void> _newCustomer() async {
    final customer = await showModalBottomSheet<CustomerRef>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const CustomerSheet(),
    );
    if (customer == null || !mounted) return;
    setState(() => _selected = customer);
    await _createVehicle();
  }

  Future<void> _createVehicle() async {
    final customer = _selected;
    final unlinked = _unlinked;
    if (customer == null || unlinked == null) return;
    final vehicle = await showModalBottomSheet<VehicleRef>(
      context: context,
      isScrollControlled: true,
      builder: (_) => VehicleSheet(
        customerId: customer.id,
        plate: unlinked.plate,
        technical: unlinked.technical,
      ),
    );
    if (vehicle == null || !mounted) return;
    Navigator.of(context).pop(PlateLookup(
      found: true,
      plate: vehicle.plate,
      customer: customer,
      vehicle: vehicle,
    ));
  }

  Future<void> _photo() async {
    setState(() => _cameraError = null);
    XFile? photo;
    try {
      photo = await widget.pickPhoto();
    } catch (_) {
      // Permissão negada, aparelho sem câmera ou falha do plugin: a digitação
      // da placa continua disponível.
      if (mounted) {
        setState(() => _cameraError = 'Não foi possível acessar a câmera. '
            'Verifique a permissão do app ou digite a placa.');
      }
      return;
    }
    // Sem foto: o usuário fechou a câmera.
    if (photo == null || !mounted) return;
    final path = photo.path;
    setState(() => _status = 'Lendo a placa...');
    String? plate;
    await runAction(context, () async {
      plate = await ref.read(apiProvider).recognizePlate(path);
    });
    if (!mounted) return;
    setState(() => _status = null);
    if (plate == null) {
      showMessage(
        context,
        'Não reconhecemos a placa. Tente de novo ou digite.',
        error: true,
      );
      return;
    }
    _plate.text = plate!;
    await _lookup();
  }

  Future<void> _lookup() async {
    if (!isValidPlate(_plate.text)) {
      showMessage(context, 'Placa inválida', error: true);
      return;
    }
    setState(() {
      _status = 'Consultando a placa...';
      _unlinked = null;
      _selected = null;
    });
    PlateLookup? result;
    await runAction(context, () async {
      result = await ref
          .read(apiProvider)
          .lookupPlate(normalizePlate(_plate.text));
    });
    if (!mounted) return;
    setState(() => _status = null);
    final lookup = result;
    if (lookup == null) return;
    if (lookup.found) {
      Navigator.of(context).pop(lookup);
      return;
    }
    setState(() => _unlinked = lookup);
    _searchCustomers(_customerSearch.text);
  }

  void _skip() {
    Navigator.of(context).pop(const PlateLookup(found: false, plate: ''));
  }


  Widget _association(PlateLookup unlinked) {
    final selected = _selected;
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Placa ainda não cadastrada',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.border),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'A placa '),
                TextSpan(
                  text: unlinked.plate,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const TextSpan(
                  text: ' ainda não está vinculada a um veículo. Selecione um '
                      'cliente existente ou cadastre um novo para continuar.',
                ),
              ]),
              style: const TextStyle(fontSize: 14),
            ),
          ),
          const SizedBox(height: 16),
          if (selected != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.muted.withValues(alpha: 0.3),
                border: Border.all(color: AppTheme.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Icon(LucideIcons.user, size: 16),
                      Text(
                        'Cliente selecionado',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      StatusChip('Pronto para vincular'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    selected.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  if ((selected.email ?? '').isNotEmpty)
                    Text(selected.email!, style: muted),
                  if ((selected.phone ?? '').isNotEmpty)
                    Text(selected.phone!, style: muted),
                  TextButton(
                    onPressed: () => setState(() => _selected = null),
                    child: const Text('Trocar cliente'),
                  ),
                ],
              ),
            )
          else ...[
            LabeledField(
              label: 'Buscar cliente existente',
              child: TextField(
                controller: _customerSearch,
                onChanged: _searchCustomers,
                decoration: const InputDecoration(
                  hintText: 'Nome, email, telefone ou CPF',
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: Text(
                      'Clientes disponíveis',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                  const Divider(height: 1),
                  if (_searchingCustomers)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Buscando clientes...',
                        textAlign: TextAlign.center,
                        style: muted,
                      ),
                    )
                  else if (_customers.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Nenhum cliente encontrado.', style: muted),
                    )
                  else
                    for (final customer in _customers)
                      InkWell(
                        onTap: () => setState(() => _selected = customer),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      customer.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    if ((customer.email ?? '').isNotEmpty)
                                      Text(customer.email!, style: muted),
                                    if ((customer.phone ?? '').isNotEmpty)
                                      Text(
                                        customer.phone!,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.mutedForeground,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              const StatusChip('Selecionar'),
                            ],
                          ),
                        ),
                      ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _newCustomer,
            icon: const Icon(LucideIcons.user),
            label: const Text('Novo cliente'),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: selected == null ? null : _createVehicle,
            icon: const Icon(LucideIcons.car),
            label: const Text('Cadastrar veículo com esta placa'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Ler placa'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          const PanelPageHeader(
            icon: LucideIcons.camera,
            title: 'Criação rápida',
            description: 'Fotografe a placa ou digite para encontrar o '
                'cliente e o veículo.',
          ),
          const SizedBox(height: 16),
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                BusyButton(
                  label: 'Fotografar a placa',
                  icon: LucideIcons.camera,
                  busy: _busy,
                  onPressed: _photo,
                ),
                if (_cameraError != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _cameraError!,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                const Row(
                  children: [
                    Expanded(child: Divider()),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'ou digite',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 20),
                LabeledField(
                  label: 'Placa',
                  child: TextField(
                    controller: _plate,
                    enabled: !_busy,
                    textCapitalization: TextCapitalization.characters,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _lookup(),
                    decoration: const InputDecoration(hintText: 'ABC1D23'),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _lookup,
                  icon: const Icon(LucideIcons.search),
                  label: const Text('Consultar'),
                ),
                if (_status != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _status!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppTheme.mutedForeground),
                  ),
                ],
              ],
            ),
          ),
          if (_unlinked != null) ...[
            const SizedBox(height: 16),
            _association(_unlinked!),
          ],
          const SizedBox(height: 12),
          TextButton(
            onPressed: _busy ? null : _skip,
            child: const Text('Continuar sem placa'),
          ),
        ],
      ),
    );
  }
}

Future<XFile?> _openCamera() => ImagePicker().pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 80,
    );
