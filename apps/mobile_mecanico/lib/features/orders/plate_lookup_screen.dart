import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

/// Primeiro passo da OS: encontra cliente e veículo pela placa, digitada ou
/// lida de uma foto. Usa a câmera do sistema, sem pedir permissão de câmera.
class PlateLookupScreen extends ConsumerStatefulWidget {
  const PlateLookupScreen({super.key});

  @override
  ConsumerState<PlateLookupScreen> createState() => _PlateLookupScreenState();
}

class _PlateLookupScreenState extends ConsumerState<PlateLookupScreen> {
  final _plate = TextEditingController();
  String? _status;

  bool get _busy => _status != null;

  @override
  void dispose() {
    _plate.dispose();
    super.dispose();
  }

  Future<void> _photo() async {
    final photo = await ImagePicker().pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 80,
    );
    if (photo == null || !mounted) return;
    setState(() => _status = 'Lendo a placa...');
    String? plate;
    await runAction(context, () async {
      plate = await ref.read(apiProvider).recognizePlate(photo.path);
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
    setState(() => _status = 'Consultando a placa...');
    PlateLookup? result;
    await runAction(context, () async {
      result = await ref
          .read(apiProvider)
          .lookupPlate(normalizePlate(_plate.text));
    });
    if (!mounted) return;
    setState(() => _status = null);
    if (result != null) Navigator.of(context).pop(result);
  }

  void _skip() {
    Navigator.of(context).pop(const PlateLookup(found: false, plate: ''));
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
