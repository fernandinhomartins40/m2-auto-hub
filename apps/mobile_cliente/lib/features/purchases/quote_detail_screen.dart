import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';

/// Orçamento aberto a partir do Início: o mesmo cartão da lista.
class QuoteDetailScreen extends StatelessWidget {
  const QuoteDetailScreen({super.key, required this.quote});

  final Quote quote;

  @override
  Widget build(BuildContext context) {
    return PanelScaffold(
      appBar: PanelAppBar(title: 'Orçamento #${quote.shortId}'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [QuoteCard(quote: quote, closeOnDecision: true)],
      ),
    );
  }
}

/// Cartão do orçamento como no PWA: resumo em caixas, serviços, endereço,
/// observações e as decisões quando a loja já respondeu.
class QuoteCard extends ConsumerStatefulWidget {
  const QuoteCard({super.key, required this.quote, this.closeOnDecision = false});

  final Quote quote;

  /// Fecha a tela depois de aprovar ou recusar (quando aberto sozinho).
  final bool closeOnDecision;

  @override
  ConsumerState<QuoteCard> createState() => _QuoteCardState();
}

class _QuoteCardState extends ConsumerState<QuoteCard> {
  bool _busy = false;

  Future<void> _decide({required bool approve}) async {
    final quote = widget.quote;
    final accepted = await confirm(
      context,
      title: approve ? 'Aprovar orçamento?' : 'Recusar orçamento?',
      message: approve
          ? 'Total de ${formatMoney(quote.total)}. A oficina recebe sua aprovação.'
          : 'A oficina será avisada de que você recusou este orçamento.',
      confirmLabel: approve ? 'Aprovar' : 'Recusar',
      destructive: !approve,
    );
    if (!accepted || !mounted) return;

    setState(() => _busy = true);
    final api = ref.read(apiProvider);
    final done = await runAction(
      context,
      () => approve ? api.approveQuote(quote.id) : api.rejectQuote(quote.id),
      success: approve ? 'Orçamento aprovado' : 'Orçamento recusado',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(quotesProvider);
      ref.invalidate(ordersProvider);
      if (widget.closeOnDecision) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final quote = widget.quote;
    final (label, tone) = quote.statusView;
    final address = quote.address;

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Orçamento #${quote.shortId}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            'Solicitado em ${formatDateTime(quote.createdAt)}',
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 16),
          LabeledBox(label: 'Itens', value: '${quote.items.length} serviço(s)'),
          const SizedBox(height: 12),
          LabeledBox(
            label: 'Total',
            value: quote.total > 0 ? formatMoney(quote.total) : 'Sob análise',
          ),
          const SizedBox(height: 12),
          LabeledBox(
            label: 'Respondido em',
            value: quote.quotedAt == null ? '-' : formatDateTime(quote.quotedAt),
          ),
          const SizedBox(height: 12),
          LabeledBox(
            label: 'Aprovado em',
            value: quote.approvedAt == null
                ? 'Ainda não'
                : formatDateTime(quote.approvedAt),
          ),
          const SizedBox(height: 16),
          for (final item in quote.items) ...[
            _QuoteItemBox(item: item),
            const SizedBox(height: 8),
          ],
          if (address != null) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _BoxLabel(LucideIcons.mapPin, 'Endereço vinculado'),
                  const SizedBox(height: 4),
                  Text(
                    '${address.street}, ${address.number}'
                    '${(address.complement ?? '').isEmpty ? '' : ' - ${address.complement}'}',
                    style: const TextStyle(fontSize: 14),
                  ),
                  Text(
                    '${address.neighborhood} - ${address.city}/${address.state}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if ((quote.notes ?? '').isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _BoxLabel(LucideIcons.messageSquare, 'Observações'),
                  const SizedBox(height: 4),
                  Text(quote.notes!, style: const TextStyle(fontSize: 14)),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (quote.awaitsApproval) ...[
            const SizedBox(height: 4),
            BusyButton(
              label: 'Aprovar e Virar Pedido',
              icon: LucideIcons.thumbsUp,
              busy: _busy,
              style: successFilled(),
              onPressed: () => _decide(approve: true),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              style: dangerOutline(),
              onPressed: _busy ? null : () => _decide(approve: false),
              icon: const Icon(LucideIcons.thumbsDown),
              label: const Text('Rejeitar'),
            ),
          ],
          if (quote.status == 'APPROVED')
            const NoticeBox(
              icon: LucideIcons.circleCheck,
              tone: StatusTone.success,
              child: Text('Orçamento aprovado e convertido em pedido.'),
            ),
        ],
      ),
    );
  }
}

class _BoxLabel extends StatelessWidget {
  const _BoxLabel(this.icon, this.label);

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.mutedForeground),
        const SizedBox(width: 6),
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.6,
            color: AppTheme.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _QuoteItemBox extends StatelessWidget {
  const _QuoteItemBox({required this.item});

  final QuoteItem item;

  @override
  Widget build(BuildContext context) {
    final hasQuote = item.quotedPrice != null;
    final description = hasQuote
        ? 'Valor final ${formatMoney(item.quotedPrice!)} por unidade'
        : item.price > 0
            ? 'Estimativa inicial ${formatMoney(item.price)} por unidade'
            : 'Aguardando precificação da equipe';
    final total = hasQuote || item.price > 0
        ? formatMoney(item.unitPrice * item.quantity)
        : 'Sob análise';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '${item.quantity}x ${item.name}',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          Text(
            description,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            total,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
