import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_exception.dart';
import '../providers.dart';
import '../widgets/feedback.dart';

/// Nome do arquivo no `Content-Disposition` da API, ou [fallback].
String fileNameFromDisposition(String? header, String fallback) {
  final match = RegExp(r'filename="?([^";]+)"?', caseSensitive: false)
      .firstMatch(header ?? '');
  final name = match?.group(1)?.trim() ?? '';
  return name.isEmpty ? fallback : name;
}

/// Área do widget de [context] na tela. No iPad o compartilhamento abre
/// ancorado nela (`sharePositionOrigin`); sem ela, o iPad não abre.
Rect? shareOrigin(BuildContext context) {
  final box = context.findRenderObject() as RenderBox?;
  return box != null && box.hasSize
      ? box.localToGlobal(Offset.zero) & box.size
      : null;
}

/// Abre o compartilhamento do sistema com um arquivo gerado no app.
/// [context] deve ser o do botão que o usuário tocou.
Future<void> shareBytes(
  BuildContext context,
  List<int> bytes, {
  required String name,
  required String mimeType,
}) {
  return _shareFile(shareOrigin(context), bytes, name, mimeType);
}

/// Abre o compartilhamento do sistema com um texto.
Future<void> shareText(BuildContext context, String text, {String? title}) {
  return SharePlus.instance.share(ShareParams(
    text: text,
    subject: title,
    title: title,
    sharePositionOrigin: shareOrigin(context),
  ));
}

Future<void> _shareFile(
  Rect? origin,
  List<int> bytes,
  String name,
  String mimeType,
) {
  return SharePlus.instance.share(ShareParams(
    files: [XFile.fromData(Uint8List.fromList(bytes), mimeType: mimeType)],
    fileNameOverrides: [name],
    sharePositionOrigin: origin,
  ));
}

/// Baixa um arquivo autenticado (o [dio] já envia o Bearer) e abre o
/// compartilhamento do sistema, de onde o usuário salva ou envia.
///
/// [context] deve ser o do botão (âncora no iPad). Com [data], a requisição
/// é POST. Lança [ApiException] se o download falhar.
Future<void> downloadAndShare(
  BuildContext context, {
  required Dio dio,
  required String path,
  required String fallbackName,
  String mimeType = 'application/pdf',
  Object? data,
}) async {
  final origin = shareOrigin(context);
  final res = await guardApi(() => dio.request<List<int>>(
        path,
        data: data,
        options: Options(
          method: data == null ? 'GET' : 'POST',
          responseType: ResponseType.bytes,
          receiveTimeout: const Duration(seconds: 60),
        ),
      ));
  final name = fileNameFromDisposition(
    res.headers.value('content-disposition'),
    fallbackName,
  );
  await _shareFile(origin, res.data ?? const [], name, mimeType);
}

/// Botão contornado que baixa [path] com o token da sessão e abre o
/// compartilhamento. Mostra [busyLabel] enquanto baixa e avisa erro ou
/// [success] na barra inferior.
class DownloadButton extends ConsumerStatefulWidget {
  const DownloadButton({
    super.key,
    required this.label,
    required this.path,
    required this.fallbackName,
    this.busyLabel,
    this.icon = LucideIcons.fileDown,
    this.mimeType = 'application/pdf',
    this.data,
    this.success,
  });

  final String label;
  final String path;
  final String fallbackName;
  final String? busyLabel;
  final IconData icon;
  final String mimeType;

  /// Corpo do POST; sem ele a requisição é GET.
  final Object? data;
  final String? success;

  @override
  ConsumerState<DownloadButton> createState() => _DownloadButtonState();
}

class _DownloadButtonState extends ConsumerState<DownloadButton> {
  bool _busy = false;

  Future<void> _download() async {
    setState(() => _busy = true);
    await runAction(
      context,
      () => downloadAndShare(
        context,
        dio: ref.read(dioProvider),
        path: widget.path,
        fallbackName: widget.fallbackName,
        mimeType: widget.mimeType,
        data: widget.data,
      ),
      success: widget.success,
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: _busy ? null : _download,
      icon: _busy
          ? const SizedBox.square(
              dimension: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(widget.icon),
      label: Text(_busy ? widget.busyLabel ?? widget.label : widget.label),
    );
  }
}
