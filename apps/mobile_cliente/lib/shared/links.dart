import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';
import 'package:url_launcher/url_launcher.dart';

Future<void> openLink(BuildContext context, Uri uri) async {
  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    showMessage(context, 'Não foi possível abrir o link.', error: true);
  }
}

Future<void> openPrivacyNotice(BuildContext context) =>
    openLink(context, Uri.parse('${Env.siteUrl}/privacidade'));

/// A loja (catálogo, carrinho e checkout) continua no site, como no PWA.
Future<void> openStore(BuildContext context) =>
    openLink(context, Uri.parse('${Env.siteUrl}/#pecas'));
