import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

class QuoteDetailScreen extends ConsumerStatefulWidget {
  const QuoteDetailScreen({super.key, required this.quote});

  final Quote quote;

  @override
  ConsumerState<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends ConsumerState<QuoteDetailScreen> {
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
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final quote = widget.quote;
    final (label, tone) = quote.statusView;
    return Scaffold(
      appBar: AppBar(title: Text('Orçamento ${quote.shortId}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 12),
          InfoRow('Solicitado em', formatDateTime(quote.createdAt)),
          if (quote.quotedAt != null)
            InfoRow('Orçado em', formatDateTime(quote.quotedAt)),
          if (quote.address != null) InfoRow('Endereço', quote.address!.line),
          if ((quote.notes ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            const SectionTitle('Observações'),
            const SizedBox(height: 4),
            Text(quote.notes!),
          ],
          const Divider(height: 32),
          const SectionTitle('Serviços'),
          const SizedBox(height: 8),
          for (final item in quote.items)
            InfoRow(
              '${item.quantity}x ${item.name}',
              formatMoney(item.unitPrice * item.quantity),
            ),
          const Divider(height: 32),
          InfoRow('Total', formatMoney(quote.total), emphasized: true),
          if (quote.awaitsApproval) ...[
            const SizedBox(height: 24),
            BusyButton(
              label: 'Aprovar orçamento',
              icon: Icons.thumb_up_outlined,
              busy: _busy,
              onPressed: () => _decide(approve: true),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _decide(approve: false),
              icon: const Icon(Icons.thumb_down_outlined),
              label: const Text('Recusar'),
            ),
          ],
        ],
      ),
    );
  }
}
