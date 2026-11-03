import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';

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

/// "Privacidade e seus dados" do perfil do PWA. "Solicitar eliminação"
/// atende à regra da Google Play para apps com cadastro: o pedido entra na
/// fila de privacidade do painel.
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
      message: 'Vamos excluir ou anonimizar seu cadastro, veículos, endereços '
          'e favoritos em até 15 dias. Notas fiscais e registros de pedidos e '
          'serviços são mantidos pelo prazo exigido em lei.',
      confirmLabel: 'Solicitar exclusão',
      destructive: true,
    );
    if (accepted && context.mounted) await _request(context, ref, 'DELETION');
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
          // O app pede a portabilidade; o arquivo chega pela equipe.
          left(
            OutlinedButton.icon(
              onPressed: () => _request(context, ref, 'PORTABILITY'),
              icon: const Icon(LucideIcons.download),
              label: const Text('Baixar meus dados'),
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
