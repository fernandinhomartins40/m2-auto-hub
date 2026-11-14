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
  'IN_PROGRESS': 'Em Progresso',
  'WAITING_CUSTOMER': 'Aguardando Cliente',
  'WAITING_SUPPORT': 'Aguardando Suporte',
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

  void _newTicket() => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const NewTicketScreen()),
      );

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
      emptyMessage: 'Nenhum ticket encontrado',
      builder: (items) => _tab == 0
          ? [for (final ticket in items.where(_matches)) _TicketCard(ticket)]
          : [_Faq(onCreateTicket: _newTicket)],
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
              if (!contacts.online && contacts.nextAvailable != null)
                Text(
                  'Próximo horário disponível: '
                  '${formatDateTime(contacts.nextAvailable)}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.mutedForeground,
                  ),
                ),
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
      child: Wrap(
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
              if ((ticket.assignedTo ?? '').isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.user,
                        size: 12, color: AppTheme.mutedForeground),
                    const SizedBox(width: 4),
                    Text(ticket.assignedTo!, style: muted),
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

/// Central de Ajuda (`FAQSection`): busca com 2 letras ou mais, categorias
/// recolhíveis com contagem e descrição, votos e o rodapé de suporte.
class _Faq extends ConsumerStatefulWidget {
  const _Faq({required this.onCreateTicket});

  final VoidCallback onCreateTicket;

  @override
  ConsumerState<_Faq> createState() => _FaqState();
}

class _FaqState extends ConsumerState<_Faq> {
  String _term = '';
  Future<List<FaqItem>>? _results;

  void _search(String value) {
    setState(() {
      _term = value;
      _results = value.trim().length >= 2
          ? ref.read(apiProvider).searchFaq(value.trim())
          : null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const CardHeading(
                icon: LucideIcons.circleHelp,
                title: 'Central de Ajuda',
              ),
              const SizedBox(height: 16),
              SearchBox(hint: 'Busque por palavras-chave...', onChanged: _search),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (results != null)
          FutureBuilder<List<FaqItem>>(
            key: ValueKey(_term),
            future: results,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final items = snapshot.data ?? const <FaqItem>[];
              if (items.isEmpty) {
                return GlassCard(
                  color: const Color(0xFFF1F5F9),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      const Text(
                        'Não encontramos resultados para sua busca',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppTheme.mutedForeground),
                      ),
                      const SizedBox(height: 8),
                      FilledButton(
                        onPressed: widget.onCreateTicket,
                        child: const Text('Criar Ticket de Suporte'),
                      ),
                    ],
                  ),
                );
              }
              return GlassCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Resultados da Busca (${items.length})',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    for (final item in items) ...[
                      const Divider(height: 24),
                      Text(item.question,
                          style: const TextStyle(fontWeight: FontWeight.w500)),
                      const SizedBox(height: 4),
                      Text(item.answer,
                          style: const TextStyle(color: AppTheme.mutedForeground)),
                      if (item.categoryName != null)
                        Text(
                          'Categoria: ${item.categoryName}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                    ],
                  ],
                ),
              );
            },
          )
        else
          ref.watch(faqProvider).when(
                skipLoadingOnRefresh: true,
                loading: () => const Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) => ErrorState(
                  message: friendlyError(error),
                  onRetry: () => ref.refresh(faqProvider.future),
                ),
                data: (categories) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final category in categories) ...[
                      _FaqCategoryCard(category: category),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
              ),
        const SizedBox(height: 16),
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Text(
                'Não encontrou o que procurava?',
                style: TextStyle(color: AppTheme.mutedForeground),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: widget.onCreateTicket,
                child: const Text('Fale com o Suporte'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FaqCategoryCard extends StatefulWidget {
  const _FaqCategoryCard({required this.category});

  final FaqCategory category;

  @override
  State<_FaqCategoryCard> createState() => _FaqCategoryCardState();
}

class _FaqCategoryCardState extends State<_FaqCategoryCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final category = widget.category;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => _open = !_open),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if ((category.icon ?? '').isNotEmpty) ...[
                        Text(category.icon!),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Text(
                          category.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '(${category.items.length})',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        _open ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                        size: 20,
                      ),
                    ],
                  ),
                  if ((category.description ?? '').isNotEmpty && !_open)
                    Text(
                      category.description!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final item in category.items) _FaqItemTile(item: item),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Pergunta com visualizações e "Esta resposta foi útil?" (`FAQItem`).
class _FaqItemTile extends ConsumerStatefulWidget {
  const _FaqItemTile({required this.item});

  final FaqItem item;

  @override
  ConsumerState<_FaqItemTile> createState() => _FaqItemTileState();
}

class _FaqItemTileState extends ConsumerState<_FaqItemTile> {
  bool? _vote;

  @override
  void initState() {
    super.initState();
    // Como o PWA, conta a visualização quando a resposta aparece.
    if (widget.item.id.isNotEmpty) {
      ref.read(apiProvider).viewFaq(widget.item.id).catchError((_) {});
    }
  }

  Future<void> _rate(bool helpful) async {
    setState(() => _vote = helpful);
    try {
      await ref.read(apiProvider).rateFaq(widget.item.id, helpful);
    } catch (_) {
      if (mounted) setState(() => _vote = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    const muted = TextStyle(fontSize: 12, color: AppTheme.mutedForeground);
    final voted = _vote != null;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.question, style: const TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Text(item.answer, style: const TextStyle(color: AppTheme.mutedForeground)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.eye, size: 12, color: AppTheme.mutedForeground),
                  const SizedBox(width: 4),
                  Text('${item.views} visualizações', style: muted),
                ],
              ),
              const Text('Esta resposta foi útil?', style: muted),
              TextButton.icon(
                onPressed: voted ? null : () => _rate(true),
                icon: const Icon(LucideIcons.thumbsUp, size: 12),
                label: Text('${item.helpfulYes + (_vote == true ? 1 : 0)}'),
              ),
              TextButton.icon(
                onPressed: voted ? null : () => _rate(false),
                icon: const Icon(LucideIcons.thumbsDown, size: 12),
                label: Text('${item.helpfulNo + (_vote == false ? 1 : 0)}'),
              ),
            ],
          ),
          const Divider(height: 16),
        ],
      ),
    );
  }
}
