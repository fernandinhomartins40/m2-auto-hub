import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../../shared/links.dart';

/// Direitos da LGPD. "Excluir minha conta" atende à regra da Google Play para
/// apps com cadastro: o pedido entra na fila de privacidade do painel.
class PrivacyScreen extends ConsumerWidget {
  const PrivacyScreen({super.key});

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
    return Scaffold(
      appBar: AppBar(title: const Text('Privacidade')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Exerça seus direitos previstos na LGPD. A M2 pode confirmar sua '
            'identidade antes de concluir uma solicitação.',
          ),
          const SizedBox(height: 16),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.article_outlined),
                  title: const Text('Ler aviso de privacidade'),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: () => openPrivacyNotice(context),
                ),
                ListTile(
                  leading: const Icon(Icons.download_outlined),
                  title: const Text('Pedir cópia dos meus dados'),
                  onTap: () => _request(context, ref, 'PORTABILITY'),
                ),
                ListTile(
                  leading: const Icon(Icons.edit_outlined),
                  title: const Text('Pedir correção de dados'),
                  onTap: () => _request(context, ref, 'CORRECTION'),
                ),
                ListTile(
                  leading: const Icon(Icons.block_outlined),
                  title: const Text('Revogar consentimento'),
                  onTap: () => _request(context, ref, 'REVOCATION'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => _deleteAccount(context, ref),
            icon: const Icon(Icons.delete_forever_outlined),
            label: const Text('Excluir minha conta'),
          ),
        ],
      ),
    );
  }
}
