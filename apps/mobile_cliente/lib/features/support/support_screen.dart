import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import 'new_ticket_screen.dart';
import 'ticket_screen.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Ajuda'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Atendimentos'),
              Tab(text: 'Dúvidas'),
              Tab(text: 'Contato'),
            ],
          ),
        ),
        body: const TabBarView(children: [_Tickets(), _Faq(), _Contact()]),
      ),
    );
  }
}

class _Tickets extends ConsumerWidget {
  const _Tickets();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'new-ticket',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NewTicketScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Novo atendimento'),
      ),
      body: AsyncPage<List<Ticket>>(
        value: ref.watch(ticketsProvider),
        onRefresh: () => ref.refresh(ticketsProvider.future),
        isEmpty: (tickets) => tickets.isEmpty,
        emptyIcon: Icons.support_agent,
        emptyMessage: 'Abra um atendimento quando precisar falar com a M2.',
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        builder: (tickets) => [
          for (final ticket in tickets)
            Card(
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                contentPadding: const EdgeInsets.all(12),
                title: Text(ticket.subject),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: StatusChip(
                      ticket.statusView.$1,
                      tone: ticket.statusView.$2,
                    ),
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => TicketScreen(ticketId: ticket.id),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Faq extends ConsumerWidget {
  const _Faq();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncPage<List<FaqCategory>>(
      value: ref.watch(faqProvider),
      onRefresh: () => ref.refresh(faqProvider.future),
      isEmpty: (categories) => categories.isEmpty,
      emptyIcon: Icons.help_outline,
      emptyMessage: 'Nenhuma pergunta frequente cadastrada.',
      builder: (categories) => [
        for (final category in categories) ...[
          SectionTitle(category.name),
          for (final item in category.items)
            Card(
              clipBehavior: Clip.antiAlias,
              child: ExpansionTile(
                title: Text(item.question),
                expandedAlignment: Alignment.centerLeft,
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                children: [Text(item.answer)],
              ),
            ),
        ],
      ],
    );
  }
}

class _Contact extends ConsumerWidget {
  const _Contact();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncPage<SupportContacts>(
      value: ref.watch(supportContactsProvider),
      onRefresh: () => ref.refresh(supportContactsProvider.future),
      builder: (contacts) => [
        if ((contacts.whatsapp ?? '').isNotEmpty)
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: const Icon(Icons.chat_outlined),
              title: const Text('WhatsApp'),
              subtitle: const Text('Fale com a M2'),
              onTap: () => openLink(
                context,
                Uri.https('wa.me', '/${contacts.whatsapp}', {
                  'text': contacts.whatsappMessage ?? '',
                }),
              ),
            ),
          ),
        if ((contacts.phone ?? '').isNotEmpty)
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: const Icon(Icons.call_outlined),
              title: const Text('Telefone'),
              subtitle: Text(contacts.phone!),
              onTap: () => openLink(
                context,
                Uri(scheme: 'tel', path: digitsOnly(contacts.phone!)),
              ),
            ),
          ),
        if ((contacts.email ?? '').isNotEmpty)
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: const Icon(Icons.mail_outline),
              title: const Text('E-mail'),
              subtitle: Text(contacts.email!),
              onTap: () => openLink(
                context,
                Uri(scheme: 'mailto', path: contacts.email),
              ),
            ),
          ),
        if (contacts.hours.isNotEmpty) ...[
          const SectionTitle('Horário de atendimento'),
          for (final line in contacts.hours) Text(line),
        ],
      ],
    );
  }
}
