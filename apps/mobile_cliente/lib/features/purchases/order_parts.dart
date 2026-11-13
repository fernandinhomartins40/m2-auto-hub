import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';

/// Ícone do pedido conforme o status (`getStatusInfo` do PWA).
IconData orderStatusIcon(String status) => switch (status) {
      'CONFIRMED' || 'DELIVERED' => LucideIcons.circleCheck,
      'IN_PRODUCTION' || 'PREPARING' => LucideIcons.package,
      'SHIPPED' => LucideIcons.truck,
      'CANCELLED' => LucideIcons.circleAlert,
      _ => LucideIcons.clock,
    };

String trackingMessage(String code) =>
    'Olá! Gostaria de rastrear meu pedido. Código de rastreamento: $code';

/// Abre o WhatsApp da loja com [message]. O número vem de `/support/config`,
/// o mesmo da tela de Ajuda. Sem número cadastrado, chama [fallback] ou avisa.
Future<void> openStoreWhatsApp(
  BuildContext context,
  WidgetRef ref,
  String message, {
  VoidCallback? fallback,
}) async {
  var number = '';
  try {
    number = (await ref.read(supportContactsProvider.future)).whatsapp ?? '';
  } catch (_) {}
  if (!context.mounted) return;
  if (number.isEmpty) {
    fallback != null
        ? fallback()
        : showMessage(context, 'Não foi possível abrir o link.', error: true);
    return;
  }
  await openLink(context, Uri.https('wa.me', '/$number', {'text': message}));
}

/// Link "Rastrear: código" do PWA.
class TrackingLink extends ConsumerWidget {
  const TrackingLink({super.key, required this.code});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        const Icon(LucideIcons.truck, size: 16, color: AppTheme.mutedForeground),
        const SizedBox(width: 8),
        Flexible(
          child: InkWell(
            onTap: () => openStoreWhatsApp(context, ref, trackingMessage(code)),
            child: Text(
              'Rastrear: $code',
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Nota fiscal do pedido com a consulta no portal da NF-e (PWA l. 254-265).
class InvoiceLine extends StatelessWidget {
  const InvoiceLine({super.key, required this.order});

  final Order order;

  static final _portal = Uri.parse(
    'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx'
    '?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=',
  );

  @override
  Widget build(BuildContext context) {
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(LucideIcons.fileText,
              size: 16, color: AppTheme.mutedForeground),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Nota fiscal nº ${order.invoiceNumber ?? ''}', style: muted),
              SelectableText(
                'Chave: ${order.invoiceKey}',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: AppTheme.mutedForeground,
                ),
              ),
              InkWell(
                onTap: () => openLink(context, _portal),
                child: const Text(
                  'Consultar no portal da NF-e',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.primary,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// "Compras na loja e na oficina" (`MyStorePurchases` do PWA), abaixo dos
/// pedidos: vendas do balcão e da oficina registradas no sistema da loja.
class StorePurchasesCard extends ConsumerWidget {
  const StorePurchasesCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);
    final value = ref.watch(storePurchasesProvider);
    final data = value.value;
    final Widget body;
    if (value.hasError && data == null) {
      body = Text(
        friendlyError(value.error),
        style: const TextStyle(fontSize: 14, color: AppTheme.danger),
      );
    } else if (data == null) {
      body = const Row(
        children: [
          SizedBox.square(
            dimension: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 8),
          Text('Carregando compras...', style: muted),
        ],
      );
    } else if (!data.linked || data.purchases.isEmpty) {
      body = Text(
        data.linked
            ? 'Nenhuma compra registrada.'
            : 'Suas compras feitas na loja aparecerão aqui assim que seu '
                'cadastro for identificado.',
        style: muted,
      );
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final purchase in data.purchases) ...[
            _StorePurchaseTile(purchase: purchase),
            const SizedBox(height: 8),
          ],
        ],
      );
    }
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const CardHeading(
            icon: LucideIcons.store,
            title: 'Compras na loja e na oficina',
            description: 'Compras feitas no balcão ou na oficina, registradas '
                'no sistema da loja.',
          ),
          const SizedBox(height: 16),
          body,
        ],
      ),
    );
  }
}

/// Compra recolhível, como o `<details>` do PWA.
class _StorePurchaseTile extends StatelessWidget {
  const _StorePurchaseTile({required this.purchase});

  final StorePurchase purchase;

  @override
  Widget build(BuildContext context) {
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 12),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
          title: Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                purchase.title,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              StatusChip(purchase.originLabel, tone: StatusTone.neutral),
              if (purchase.cancelled)
                const StatusChip('Cancelada', tone: StatusTone.danger),
            ],
          ),
          subtitle: Text(
            [
              if (purchase.date != null) formatDate(purchase.date),
              formatMoney(purchase.total),
            ].join(' · '),
            style: muted,
          ),
          children: [
            const Divider(height: 1),
            const SizedBox(height: 8),
            if (purchase.items.isEmpty)
              Text(
                'Itens não informados.'
                '${purchase.status == null ? '' : ' Situação: ${purchase.status}.'}',
                style: muted,
              )
            else
              for (final item in purchase.items) ...[
                ItemLine(
                  name: '${item.quantity}x ${item.name}',
                  trailing: formatMoney(item.total),
                ),
                const SizedBox(height: 4),
              ],
          ],
        ),
      ),
    );
  }
}
