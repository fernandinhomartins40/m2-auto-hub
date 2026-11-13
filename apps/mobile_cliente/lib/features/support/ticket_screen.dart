import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import 'new_ticket_screen.dart';
import 'support_screen.dart';

class TicketScreen extends ConsumerStatefulWidget {
  const TicketScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  ConsumerState<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends ConsumerState<TicketScreen> {
  final _message = TextEditingController();
  bool _sending = false;

  String get _id => widget.ticketId;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  void _reload() {
    ref.invalidate(ticketProvider(_id));
    ref.invalidate(ticketMessagesProvider(_id));
    ref.invalidate(ticketsProvider);
  }

  Future<void> _send() async {
    final text = _message.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    final done = await runAction(
      context,
      () => ref.read(apiProvider).sendTicketMessage(_id, text),
    );
    if (!mounted) return;
    setState(() => _sending = false);
    if (done) {
      _message.clear();
      _reload();
    }
  }

  Future<void> _close() async {
    final accepted = await confirm(
      context,
      title: 'Encerrar atendimento?',
      message: 'Você poderá abrir um novo quando precisar.',
      confirmLabel: 'Encerrar',
    );
    if (!accepted || !mounted) return;
    final done = await runAction(
      context,
      () => ref.read(apiProvider).closeTicket(_id),
      success: 'Atendimento encerrado',
    );
    if (!done || !mounted) return;
    _reload();
    // Como no PWA, fechar leva direto à avaliação.
    if (ref.read(ticketProvider(_id)).value?.rating == null) await _rate();
  }

  Future<void> _reopen() async {
    final done = await runAction(
      context,
      () => ref.read(apiProvider).reopenTicket(_id),
      success: 'Atendimento reaberto',
    );
    if (done) _reload();
  }

  Future<void> _rate() async {
    final rated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => TicketRatingSheet(ticketId: _id),
    );
    if (rated == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final ticket = ref.watch(ticketProvider(_id)).value;
    final messages = ref.watch(ticketMessagesProvider(_id));
    // O PWA só tira a resposta e o "Fechar" do atendimento fechado.
    final open = ticket != null && ticket.status != 'CLOSED';
    final canRate = ticket != null &&
        (ticket.status == 'CLOSED' || ticket.status == 'RESOLVED') &&
        ticket.rating == null;

    return PanelScaffold(
      appBar: PanelAppBar(
        title: ticket?.subject ?? 'Atendimento',
        actions: [
          if (ticket?.status == 'RESOLVED')
            TextButton(onPressed: _reopen, child: const Text('Reabrir')),
          if (open)
            IconButton(
              tooltip: 'Encerrar atendimento',
              icon: const Icon(LucideIcons.circleCheck, size: 20),
              onPressed: _close,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: AsyncPage<List<TicketMessage>>(
              value: messages,
              header: [
                if (ticket != null) _TicketHeader(ticket: ticket),
                if (canRate)
                  NoticeBox(
                    icon: LucideIcons.star,
                    tone: StatusTone.neutral,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Seu problema foi resolvido?'),
                        const SizedBox(height: 8),
                        FilledButton(
                          onPressed: _rate,
                          child: const Text('Avaliar Atendimento'),
                        ),
                      ],
                    ),
                  ),
              ],
              onRefresh: () async {
                _reload();
                await ref
                    .read(ticketMessagesProvider(_id).future)
                    .then<void>((_) {}, onError: (_) {});
              },
              isEmpty: (items) => items.isEmpty,
              emptyMessage: 'Nenhuma mensagem ainda.',
              builder: (items) => [
                for (final item in items) _Bubble(message: item),
              ],
            ),
          ),
          if (open)
            DecoratedBox(
              decoration: frostedBarDecoration(top: false),
              child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _message,
                        minLines: 1,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: const InputDecoration(
                          hintText: 'Escreva sua mensagem',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      tooltip: 'Enviar',
                      style: IconButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      icon: const Icon(LucideIcons.send, size: 18),
                      onPressed: _sending ? null : _send,
                    ),
                  ],
                ),
              ),
            ),
            ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final TicketMessage message;

  @override
  Widget build(BuildContext context) {
    final mine = message.fromCustomer;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: mine
              ? BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(12),
                )
              : glassDecoration(radius: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                message.message,
                style: TextStyle(color: mine ? Colors.white : AppTheme.slate950),
              ),
              const SizedBox(height: 4),
              Text(
                formatDateTime(message.createdAt),
                style: TextStyle(
                  fontSize: 11,
                  color: mine
                      ? Colors.white.withValues(alpha: 0.8)
                      : AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  const _TicketHeader({required this.ticket});

  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    final (status, statusTone) = ticket.statusView;
    final (priority, priorityTone) = ticket.priorityView;
    return PanelPageHeader(
      icon: LucideIcons.messageCircle,
      title: ticket.subject,
      description: 'Aberto ${timeAgo(ticket.createdAt ?? ticket.updatedAt)}',
      badge: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          StatusChip(
            ticketCategories[ticket.category] ?? ticket.category,
            tone: StatusTone.neutral,
          ),
          StatusChip(status, tone: statusTone),
          StatusChip(priority, tone: priorityTone),
        ],
      ),
    );
  }
}

/// Avaliação do atendimento (`TicketRating` do PWA): estrelas, comentário
/// opcional, "Pular" e "Enviar Avaliação". Fecha com `true` quando enviou.
class TicketRatingSheet extends ConsumerStatefulWidget {
  const TicketRatingSheet({super.key, required this.ticketId});

  final String ticketId;

  @override
  ConsumerState<TicketRatingSheet> createState() => _TicketRatingSheetState();
}

class _TicketRatingSheetState extends ConsumerState<TicketRatingSheet> {
  final _feedback = TextEditingController();
  int _rating = 0;
  bool _busy = false;

  @override
  void dispose() {
    _feedback.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final done = await runAction(
      context,
      () => ref.read(apiProvider).rateTicket(
            widget.ticketId,
            _rating,
            feedback: _feedback.text.trim(),
          ),
      success: 'Obrigado pela avaliação',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Como foi o atendimento?',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          const Text(
            'Sua opinião nos ajuda a melhorar',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.mutedForeground),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var star = 1; star <= 5; star++)
                IconButton(
                  tooltip: '$star de 5',
                  iconSize: 36,
                  icon: Icon(
                    LucideIcons.star,
                    color: star <= _rating
                        ? const Color(0xFFFACC15)
                        : const Color(0xFFD1D5DB),
                  ),
                  onPressed: () => setState(() => _rating = star),
                ),
            ],
          ),
          const SizedBox(height: 16),
          LabeledField(
            label: 'Comentário (opcional)',
            child: TextField(
              controller: _feedback,
              minLines: 3,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                hintText: 'Conte-nos mais sobre sua experiência...',
              ),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            alignment: WrapAlignment.end,
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton(
                onPressed: _busy ? null : () => Navigator.of(context).pop(),
                child: const Text('Pular'),
              ),
              BusyButton(
                label: 'Enviar Avaliação',
                busy: _busy,
                onPressed: _rating == 0 ? null : _submit,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
