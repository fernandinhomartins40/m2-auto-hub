import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';

/// Privacidade aberta pelo menu "Mais".
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Privacidade'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: const [PrivacyCard()],
      ),
    );
  }
}

/// "Privacidade e seus dados" do perfil do PWA. "Excluir minha conta"
/// atende à Google Play e à App Store: a API exclui a conta na hora e o app
/// encerra a sessão.
class PrivacyCard extends ConsumerWidget {
  const PrivacyCard({super.key});

  Future<void> _request(BuildContext context, WidgetRef ref, String type) {
    return runAction(
      context,
      () => ref.read(apiProvider).privacyRequest(type),
      success: 'Solicitação registrada. Respondemos em até 15 dias.',
    );
  }

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final accepted = await confirm(
      context,
      title: 'Excluir sua conta?',
      message: 'Sua conta será excluída agora e você sairá do app. Apagamos '
          'ou anonimizamos seu cadastro, veículos, endereços e favoritos. '
          'Notas fiscais e registros de pedidos e serviços são mantidos pelo '
          'prazo exigido em lei. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir conta',
      destructive: true,
    );
    if (!accepted || !context.mounted) return;
    try {
      final message = await ref.read(apiProvider).deleteAccount();
      if (context.mounted) showMessage(context, message);
      await ref.read(authControllerProvider.notifier).logout();
    } catch (error) {
      if (context.mounted) {
        showMessage(context, friendlyError(error), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Widget left(Widget child) =>
        Align(alignment: Alignment.centerLeft, child: child);

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const CardHeading(
            icon: LucideIcons.shieldCheck,
            title: 'Privacidade e seus dados',
            description: 'Exporte seus dados ou exerça direitos previstos na '
                'LGPD. Solicitações podem exigir confirmação de identidade.',
          ),
          const SizedBox(height: 20),
          left(
            const DownloadButton(
              label: 'Baixar meus dados',
              icon: LucideIcons.download,
              path: '/privacy/me/export',
              mimeType: 'application/json',
              fallbackName: 'meus-dados.json',
            ),
          ),
          const SizedBox(height: 12),
          left(
            OutlinedButton(
              onPressed: () => _request(context, ref, 'CORRECTION'),
              child: const Text('Solicitar correção'),
            ),
          ),
          const SizedBox(height: 12),
          left(
            OutlinedButton(
              onPressed: () => _request(context, ref, 'REVOCATION'),
              child: const Text('Revogar consentimento'),
            ),
          ),
          const SizedBox(height: 12),
          left(
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.destructive,
              ),
              onPressed: () => _deleteAccount(context, ref),
              child: const Text('Excluir minha conta'),
            ),
          ),
          const SizedBox(height: 8),
          left(
            TextButton(
              onPressed: () => openPrivacyNotice(context),
              child: const Text('Ler aviso de privacidade'),
            ),
          ),
        ],
      ),
    );
  }
}
