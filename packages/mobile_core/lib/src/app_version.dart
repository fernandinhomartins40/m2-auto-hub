import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api/api_response.dart';
import 'providers.dart';
import 'theme/app_theme.dart';
import 'widgets/panel.dart';

/// O build instalado está abaixo do mínimo aceito pela API.
class UpdateRequired {
  const UpdateRequired(this.storeUrl);

  /// Página do app na loja; `null` quando ainda não há link (iOS antes da
  /// publicação): a tela mostra só o aviso.
  final String? storeUrl;
}

/// Pergunta à API o menor build aceito para [app] (`cliente` ou `mecanico`).
/// Devolve `null` quando o app pode seguir, inclusive sem rede ou com a API
/// fora do ar: a checagem nunca bloqueia por falha.
Future<UpdateRequired?> checkMinVersion(Dio dio, String app) async {
  try {
    // O CI grava o --build-number aqui (versionCode / CFBundleVersion).
    final build = int.tryParse((await PackageInfo.fromPlatform()).buildNumber);
    if (build == null) return null;
    final res = await dio.get(
      '/settings/app-version',
      queryParameters: {
        'app': app,
        'platform': Platform.isIOS ? 'ios' : 'android',
      },
    );
    final data = unwrapObject(res.data);
    if (build >= asInt(data['minBuild'])) return null;
    final url = data['storeUrl']?.toString() ?? '';
    return UpdateRequired(url.isEmpty ? null : url);
  } catch (_) {
    return null;
  }
}

/// Mostra "Atualize o app" no lugar de [child] quando o build é antigo.
/// Use no `builder` do `MaterialApp.router`.
class MinVersionGate extends ConsumerStatefulWidget {
  const MinVersionGate({super.key, required this.app, required this.child});

  final String app;
  final Widget child;

  @override
  ConsumerState<MinVersionGate> createState() => _MinVersionGateState();
}

class _MinVersionGateState extends ConsumerState<MinVersionGate> {
  UpdateRequired? _update;

  @override
  void initState() {
    super.initState();
    checkMinVersion(ref.read(dioProvider), widget.app).then((update) {
      if (mounted && update != null) setState(() => _update = update);
    });
  }

  @override
  Widget build(BuildContext context) {
    final update = _update;
    return update == null
        ? widget.child
        : UpdateRequiredScreen(storeUrl: update.storeUrl);
  }
}

class UpdateRequiredScreen extends StatelessWidget {
  const UpdateRequiredScreen({super.key, this.storeUrl});

  final String? storeUrl;

  @override
  Widget build(BuildContext context) {
    final url = storeUrl;
    return PanelScaffold(
      login: true,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const BrandMark(size: 56),
                  const SizedBox(height: 20),
                  Text(
                    'Atualize o app',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    url == null
                        ? 'Esta versão não é mais aceita. Instale a versão mais '
                            'recente pela loja de aplicativos para continuar.'
                        : 'Esta versão não é mais aceita. Instale a versão mais '
                            'recente para continuar.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppTheme.mutedForeground),
                  ),
                  if (url != null) ...[
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => launchUrl(
                          Uri.parse(url),
                          mode: LaunchMode.externalApplication,
                        ),
                        child: const Text('Atualizar agora'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
