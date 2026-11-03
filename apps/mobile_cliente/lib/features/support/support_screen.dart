import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';
import 'new_ticket_screen.dart';
import 'ticket_screen.dart';

const _ticketStatus = {
  'all': 'Todos os Status',
  'OPEN': 'Aberto',
  'IN_PROGRESS': 'Em atendimento',
  'WAITING_CUSTOMER': 'Aguardando você',
  'WAITING_SUPPORT': 'Aguardando suporte',
  'RESOLVED': 'Resolvido',
  'CLOSED': 'Fechado',
};

const _ticketCategories = {
  'all': 'Todas as Categorias',
  ...ticketCategories,
};

/// Ajuda (`SupportDashboard` do PWA): contatos, horários, atendimentos e FAQ.
class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  int _tab = 0;
  String _search = '';
  String _status = 'all';
  String _category = 'all';

  Future<void> _refresh() async {
    ref.invalidate(ticketsProvider);
    ref.invalidate(supportContactsProvider);
    ref.invalidate(faqProvider);
    await ref.read(ticketsProvider.future).then<void>((_) {}, onError: (_) {});
  }

  bool _matches(Ticket ticket) {
    if (_status != 'all' && ticket.status != _status) return false;
    if (_category != 'all' && ticket.category != _category) return false;
    final term = withoutAccents(_search.trim());
    return term.isEmpty || withoutAccents(ticket.subject).contains(term);
  }

  @override
  Widget build(BuildContext context) {
    final tickets = ref.watch(ticketsProvider);
    final all = tickets.value ?? const <Ticket>[];
    final contacts = ref.watch(supportContactsProvider).value;
    final rated = all.where((ticket) => ticket.rating != null).toList();
    final average = rated.isEmpty
        ? 0.0
        : rated.fold<int>(0, (sum, t) => sum + t.rating!) / rated.length;

    return AsyncPage<List<Ticket>>(
      value: tickets,
      onRefresh: _refresh,
      header: [
        PanelPageHeader(
          icon: LucideIcons.messageCircle,
          title: 'Suporte ao cliente',
          description: 'Como podemos ajudar hoje?',
          actions: [
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NewTicketScreen()),
              ),
              icon: const Icon(LucideIcons.plus),
              label: const Text('Novo Ticket'),
            ),
          ],
        ),
        TwoColumnGrid(
          children: [
            StatTile(
              label: 'Total',
              value: '${all.length}',
              icon: LucideIcons.messageCircle,
              iconColor: const Color(0xFF2563EB),
            ),
            StatTile(
              label: 'Abertos',
              value: '${all.where((t) => t.isOpen).length}',
              icon: LucideIcons.circleAlert,
              iconColor: AppTheme.orange,
            ),
            StatTile(
              label: 'Resolvidos',
              value: '${all.where((t) => t.status == 'RESOLVED').length}',
              icon: LucideIcons.circleCheck,
              iconColor: AppTheme.success,
            ),
            StatTile(
              label: 'Avaliação Média',
              value: average.toStringAsFixed(1),
              icon: LucideIcons.trendingUp,
              iconColor: AppTheme.purple,
            ),
          ],
        ),
        if (contacts != null) ..._contacts(contacts),
        _TicketTabs(
          index: _tab,
          onChanged: (index) => setState(() => _tab = index),
        ),
        if (_tab == 0)
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Filtros', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                SearchBox(
                  hint: 'Buscar tickets...',
                  onChanged: (value) => setState(() => _search = value),
                ),
                const SizedBox(height: 12),
                FilterSelect<String>(
                  value: _status,
                  options: _ticketStatus,
                  onChanged: (value) => setState(() => _status = value),
                ),
                const SizedBox(height: 12),
                FilterSelect<String>(
                  value: _category,
                  options: _ticketCategories,
                  onChanged: (value) => setState(() => _category = value),
                ),
              ],
            ),
          ),
      ],
      isEmpty: (items) => _tab == 0 && items.where(_matches).isEmpty,
      emptyIcon: LucideIcons.messageCircle,
      emptyMessage: all.isEmpty
          ? 'Abra um atendimento quando precisar falar com a M2.'
          : 'Nenhum ticket encontrado com esses filtros.',
      builder: (items) => _tab == 0
          ? [for (final ticket in items.where(_matches)) _TicketCard(ticket)]
          : [const _Faq()],
    );
  }

  List<Widget> _contacts(SupportContacts contacts) {
    return [
      if ((contacts.whatsapp ?? '').isNotEmpty)
        _ContactCard(
          icon: LucideIcons.messageCircle,
          color: const Color(0xFF22C55E),
          title: 'WhatsApp',
          subtitle: 'Fale conosco agora mesmo',
          action: 'Abrir Chat',
          onTap: () => openLink(
            context,
            Uri.https('wa.me', '/${contacts.whatsapp}', {
              'text': contacts.whatsappMessage ?? '',
            }),
          ),
        ),
      if ((contacts.email ?? '').isNotEmpty)
        _ContactCard(
          icon: LucideIcons.mail,
          color: const Color(0xFF3B82F6),
          title: 'Email',
          subtitle: contacts.email!,
          action: 'Enviar Email',
          onTap: () => openLink(
            context,
            Uri(scheme: 'mailto', path: contacts.email),
          ),
        ),
      if ((contacts.phone ?? '').isNotEmpty)
        _ContactCard(
          icon: LucideIcons.phone,
          color: const Color(0xFFA855F7),
          title: 'Telefone',
          subtitle: contacts.phone!,
          action: 'Ligar Agora',
          onTap: () => openLink(
            context,
            Uri(scheme: 'tel', path: digitsOnly(contacts.phone!)),
          ),
        ),
      if (contacts.schedule.isNotEmpty)
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.clock, size: 20),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Horários de Atendimento',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: contacts.online
                          ? AppTheme.success
                          : const Color(0xFF6B7280),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      contacts.online ? 'Online' : 'Offline',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              for (final (day, hours) in contacts.schedule) ...[
                Text(day, style: const TextStyle(fontWeight: FontWeight.w500)),
                Text(
                  hours,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.mutedForeground,
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ],
          ),
        ),
    ];
  }
}

class _TicketTabs extends StatelessWidget {
  const _TicketTabs({required this.index, required this.onChanged});

  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget tab(int i, String label) {
      final active = i == index;
      return GestureDetector(
        onTap: () => onChanged(i),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: active ? AppTheme.primary : null,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: active ? Colors.white : AppTheme.slate950,
            ),
          ),
        ),
      );
    }

    return DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          tab(0, 'Meus Tickets'),
          tab(1, 'Central de Ajuda (FAQ)'),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.action,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconTile(icon: icon, color: color, size: 48, filled: true),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontFamily: AppTheme.headingFont,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: onTap, child: Text(action)),
        ],
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard(this.ticket);

  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    final (status, statusTone) = ticket.statusView;
    final (priority, priorityTone) = ticket.priorityView;
    const muted = TextStyle(fontSize: 13, color: AppTheme.mutedForeground);
    return GlassCard(
      padding: const EdgeInsets.all(20),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => TicketScreen(ticketId: ticket.id)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  ticket.subject,
                  style: const TextStyle(
                    fontFamily: AppTheme.headingFont,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Wrap(
                spacing: 6,
                children: [
                  StatusChip(status, tone: statusTone),
                  StatusChip(priority, tone: priorityTone),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.clock,
                      size: 12, color: AppTheme.mutedForeground),
                  const SizedBox(width: 4),
                  Text(timeAgo(ticket.createdAt ?? ticket.updatedAt), style: muted),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.messageSquare,
                      size: 12, color: AppTheme.mutedForeground),
                  const SizedBox(width: 4),
                  Text('${ticket.messageCount} mensagens', style: muted),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// "há 31 minutos", como o `formatDistanceToNow` do PWA.
String timeAgo(DateTime? date) {
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'agora mesmo';
  if (diff.inMinutes < 60) {
    return 'há ${diff.inMinutes} ${diff.inMinutes == 1 ? 'minuto' : 'minutos'}';
  }
  if (diff.inHours < 24) {
    return 'há ${diff.inHours} ${diff.inHours == 1 ? 'hora' : 'horas'}';
  }
  if (diff.inDays < 30) {
    return 'há ${diff.inDays} ${diff.inDays == 1 ? 'dia' : 'dias'}';
  }
  return formatDate(date);
}

class _Faq extends ConsumerWidget {
  const _Faq();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final faq = ref.watch(faqProvider);
    return faq.when(
      skipLoadingOnRefresh: true,
      loading: () => const Padding(
        padding: EdgeInsets.all(32),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => ErrorState(
        message: friendlyError(error),
        onRetry: () => ref.refresh(faqProvider.future),
      ),
      data: (categories) {
        if (categories.isEmpty) {
          return const EmptyState(
            icon: LucideIcons.circleHelp,
            message: 'Nenhuma pergunta frequente cadastrada.',
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final category in categories) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 8, top: 4),
                child: Text(
                  category.name,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              for (final item in category.items) ...[
                GlassCard(
                  padding: EdgeInsets.zero,
                  child: Theme(
                    data: Theme.of(context)
                        .copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      title: Text(
                        item.question,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      iconColor: AppTheme.primary,
                      expandedAlignment: Alignment.centerLeft,
                      childrenPadding:
                          const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      children: [
                        Text(
                          item.answer,
                          style: const TextStyle(
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 8),
            ],
          ],
        );
      },
    );
  }
}
