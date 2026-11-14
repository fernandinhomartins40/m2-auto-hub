import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import 'checklist_row.dart';

final _longDate = DateFormat("d 'de' MMMM 'de' y 'às' HH:mm", 'pt_BR');

/// Detalhes da revisão (`RevisionDetailsModal`): dados, checklist e histórico.
class RevisionDetailsScreen extends ConsumerStatefulWidget {
  const RevisionDetailsScreen({super.key, required this.revisionId});

  final String revisionId;

  @override
  ConsumerState<RevisionDetailsScreen> createState() =>
      _RevisionDetailsScreenState();
}

class _RevisionDetailsScreenState extends ConsumerState<RevisionDetailsScreen> {
  late Future<Revision> _future = _fetch();
  int _tab = 0;

  Future<Revision> _fetch() =>
      ref.read(apiProvider).revision(widget.revisionId);

  @override
  Widget build(BuildContext context) {
    final shortId = widget.revisionId.length > 8
        ? widget.revisionId.substring(0, 8)
        : widget.revisionId;
    return PanelScaffold(
      appBar: PanelAppBar(title: 'Revisão #$shortId'),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          // Como o rodapé do modal no celular: empilhado, ação em cima.
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DownloadButton(
                label: 'Exportar PDF',
                busyLabel: 'Gerando PDF...',
                path: '/admin/revisions/${widget.revisionId}/export-pdf',
                data: const <String, dynamic>{},
                fallbackName: 'revisao-$shortId.pdf',
                success: 'PDF gerado',
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Fechar'),
              ),
            ],
          ),
        ),
      ),
      body: FutureBuilder<Revision>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: ErrorState(
                message: friendlyError(snapshot.error),
                onRetry: () async => setState(() => _future = _fetch()),
              ),
            );
          }
          final revision = snapshot.data;
          if (revision == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              Row(
                children: [
                  revisionStatusChip(revision.status),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Criada em ${formatDateTime(revision.createdAt ?? revision.date)}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              WorkspaceTabs(
                expand: true,
                index: _tab,
                onChanged: (tab) => setState(() => _tab = tab),
                tabs: const [
                  WorkspaceTab('Detalhes'),
                  WorkspaceTab('Checklist'),
                  WorkspaceTab('Histórico'),
                ],
              ),
              const SizedBox(height: 16),
              ...switch (_tab) {
                0 => _details(revision),
                1 => _checklist(revision),
                _ => _history(revision),
              },
            ],
          );
        },
      ),
    );
  }

  List<Widget> _details(Revision revision) {
    final customer = revision.customer;
    final vehicle = revision.vehicle;
    final mechanic = revision.assignedMechanic;
    return [
      _Section(
        icon: LucideIcons.user,
        title: 'Cliente',
        children: [
          _Strong(customer?.name ?? 'N/A'),
          if ((customer?.email ?? '').isNotEmpty) _Muted(customer!.email!),
          if ((customer?.phone ?? '').isNotEmpty) _Muted(customer!.phone!),
        ],
      ),
      _Section(
        icon: LucideIcons.car,
        title: 'Veículo',
        children: [
          _Strong(vehicle?.label ?? 'N/A'),
          if (vehicle?.year != null) _Muted('Ano: ${vehicle!.year}'),
          _Muted('Placa: ${vehicle?.plate ?? 'N/A'}'),
          if ((vehicle?.color ?? '').isNotEmpty) _Muted('Cor: ${vehicle!.color}'),
        ],
      ),
      _Section(
        title: 'Informações da Revisão',
        children: [
          MetaLine(
            LucideIcons.calendar,
            'Data: ${revision.date == null ? '-' : _longDate.format(revision.date!)}',
          ),
          if ((revision.mileage ?? 0) > 0) ...[
            const SizedBox(height: 8),
            MetaLine(
              LucideIcons.gauge,
              'Quilometragem: ${formatKm(revision.mileage)}',
            ),
          ],
          if (revision.completedAt != null) ...[
            const SizedBox(height: 8),
            MetaLine(
              LucideIcons.circleCheck,
              'Concluída em: ${_longDate.format(revision.completedAt!)}',
            ),
          ],
        ],
      ),
      _Section(
        icon: LucideIcons.userCog,
        title: 'Mecânico Responsável',
        children: [
          if (mechanic == null)
            const _Muted('Nenhum mecânico atribuído')
          else ...[
            _Strong(mechanic.name),
            _Muted(mechanic.email),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: StatusChip(
                mechanic.isMechanic ? 'Mecânico' : mechanic.role,
                tone: StatusTone.dark,
              ),
            ),
            if (revision.assignedAt != null)
              _Muted('Atribuído em ${formatDateTime(revision.assignedAt)}'),
            if ((revision.mechanicNotes ?? '').isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: gray50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Observações do Mecânico:',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                    _Muted(revision.mechanicNotes!),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
      if ((revision.generalNotes ?? '').isNotEmpty)
        _Section(
          title: 'Observações Gerais',
          children: [Text(revision.generalNotes!)],
        ),
      if ((revision.recommendations ?? '').isNotEmpty)
        _Section(
          title: 'Recomendações',
          children: [Text(revision.recommendations!)],
        ),
    ];
  }

  List<Widget> _checklist(Revision revision) {
    if (revision.checks.isEmpty) {
      return [
        const EmptyState(
          icon: LucideIcons.circleAlert,
          message: 'Nenhum item no checklist',
        ),
        const Text(
          'Esta revisão ainda não possui dados de checklist',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: gray600),
        ),
        if (revision.status == 'DRAFT')
          const Text(
            'Status: Rascunho - Aguardando preenchimento',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: AppTheme.primary),
          ),
      ];
    }
    final grouped = <String, List<CheckEntry>>{};
    for (final entry in revision.checks) {
      grouped.putIfAbsent(entry.categoryName, () => []).add(entry);
    }
    return [
      for (final group in grouped.entries)
        GlassCard(
          padding: EdgeInsets.zero,
          radius: 12,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Row(
                  children: [
                    Text(
                      group.key,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    CountBadge(group.value.length),
                  ],
                ),
              ),
              for (final entry in group.value) ...[
                const Divider(),
                EvaluatedRow(entry: entry, onReopen: () {}),
              ],
            ],
          ),
        ),
    ];
  }

  List<Widget> _history(Revision revision) {
    final events = [
      if (revision.createdAt != null)
        ('Revisão Criada', revision.createdAt!, LucideIcons.circle),
      if (revision.assignedAt != null)
        ('Mecânico Atribuído', revision.assignedAt!, LucideIcons.userCog),
      if (revision.completedAt != null)
        ('Revisão Concluída', revision.completedAt!, LucideIcons.circleCheck),
    ];
    return [
      if (revision.transfers.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Text(
            'Nenhuma transferência registrada',
            textAlign: TextAlign.center,
            style: TextStyle(color: gray600),
          ),
        )
      else
        _Section(
          icon: LucideIcons.arrowRightLeft,
          title: 'Histórico de Transferências',
          children: [
            for (final t in revision.transfers) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const IconTile(icon: LucideIcons.arrowRightLeft, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Strong('De ${t.from} para ${t.to}', size: 14),
                        _Muted(formatDateTime(t.at)),
                        if ((t.reason ?? '').isNotEmpty)
                          _Muted('Motivo: ${t.reason}'),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
      _Section(
        icon: LucideIcons.clock,
        title: 'Timeline',
        children: [
          for (final (label, date, icon) in events) ...[
            Row(
              children: [
                IconTile(icon: icon, size: 36),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Strong(label, size: 14),
                      _Muted(formatDateTime(date)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    ];
  }
}

class _Section extends StatelessWidget {
  const _Section({this.icon, required this.title, required this.children});

  final IconData? icon;
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 20, color: AppTheme.slate950),
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _Strong extends StatelessWidget {
  const _Strong(this.text, {this.size = 18});

  final String text;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: AppTheme.headingFont,
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: AppTheme.slate950,
      ),
    );
  }
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(text, style: const TextStyle(fontSize: 14, color: gray600)),
    );
  }
}
