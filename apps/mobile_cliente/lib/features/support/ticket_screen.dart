import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

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
    if (done) _reload();
  }

  Future<void> _rate(int rating) async {
    final done = await runAction(
      context,
      () => ref.read(apiProvider).rateTicket(_id, rating),
      success: 'Obrigado pela avaliação',
    );
    if (done) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final ticket = ref.watch(ticketProvider(_id)).value;
    final messages = ref.watch(ticketMessagesProvider(_id));
    final open = ticket?.isOpen ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(ticket?.subject ?? 'Atendimento'),
        actions: [
          if (open)
            IconButton(
              tooltip: 'Encerrar atendimento',
              icon: const Icon(Icons.task_alt),
              onPressed: _close,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: AsyncPage<List<TicketMessage>>(
              value: messages,
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
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8),
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
                    IconButton(
                      tooltip: 'Enviar',
                      icon: const Icon(Icons.send),
                      onPressed: _sending ? null : _send,
                    ),
                  ],
                ),
              ),
            )
          else if (ticket != null && ticket.rating == null)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Como foi o atendimento?'),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var star = 1; star <= 5; star++)
                          IconButton(
                            tooltip: '$star de 5',
                            icon: const Icon(Icons.star_border),
                            onPressed: () => _rate(star),
                          ),
                      ],
                    ),
                  ],
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
    final scheme = Theme.of(context).colorScheme;
    final mine = message.fromCustomer;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: mine ? scheme.primaryContainer : scheme.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message.message),
              const SizedBox(height: 4),
              Text(
                formatDateTime(message.createdAt),
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
