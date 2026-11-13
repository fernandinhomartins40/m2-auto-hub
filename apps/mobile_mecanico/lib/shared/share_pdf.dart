import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:share_plus/share_plus.dart';

/// Abre o PDF baixado pelo compartilhamento do sistema.
///
/// [context] é o do botão: no iPad a folha de compartilhamento precisa de uma
/// origem na tela, senão o plugin falha.
// shortcut: cópia mínima no app; trocar pelo helper de download do núcleo
// (m2_core, agente A5) quando ele existir.
Future<void> sharePdf(
  BuildContext context,
  Uint8List bytes,
  String filename,
) async {
  final box = context.findRenderObject() as RenderBox?;
  await SharePlus.instance.share(
    ShareParams(
      files: [XFile.fromData(bytes, mimeType: 'application/pdf')],
      fileNameOverrides: [filename],
      sharePositionOrigin:
          box == null ? null : box.localToGlobal(Offset.zero) & box.size,
    ),
  );
}
