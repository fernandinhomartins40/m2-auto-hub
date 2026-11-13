import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/share_pdf.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';
import 'checklist_row.dart';

final _longDate = DateFormat("d 'de' MMMM 'de' y 'às' HH:mm", 'pt_BR');

/// Detalhes da revisão (`RevisionDetailsModal`): dados, checklist e histórico.
class RevisionDetailsScreen extends ConsumerStatefulWidget {
  const RevisionDetailsScreen({
    super.key,
    required this.revisionId,
    this.share = sharePdf,
  });

  final String revisionId;

  /// Entrega o PDF ao sistema; trocado nos testes.
  final Future<void> Function(BuildContext, Uint8List, String) share;

  @override
  ConsumerState<RevisionDetailsScreen> createState() =>
      _RevisionDetailsScreenState();
}

class _RevisionDetailsScreenState extends ConsumerState<RevisionDetailsScreen> {
  late Future<Revision> _future = _fetch();
  int _tab = 0;
  bool _exporting = false;

  Future<Revision> _fetch() =>
      ref.read(apiProvider).revision(widget.revisionId);

  Future<void> _exportPdf(BuildContext buttonContext, String shortId) async {
    setState(() => _exporting = true);
    try {
      final bytes = await ref.read(apiProvider).revisionPdf(widget.revisionId);
      if (!buttonContext.mounted) return;
      await widget.share(buttonContext, bytes, 'revisao-$shortId.pdf');
      if (mounted) showMessage(context, 'PDF gerado');
    } catch (error) {
      if (mounted) {
        showMessage(
          context,
          'Erro ao gerar PDF. ${friendlyError(error)}',
          error: true,
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

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
              Builder(
                builder: (buttonContext) => OutlinedButton.icon(
                  onPressed: _exporting
                      ? null
                      : () => _exportPdf(buttonContext, shortId),
                  icon: const Icon(LucideIcons.download),
                  label: Text(_exporting ? 'Gerando PDF...' : 'Exportar PDF'),
                ),
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
    final mechanic = ref.watch(authControllerProvider).mechanic;
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
          const SizedBox(height: 8),
          MetaLine(
            LucideIcons.gauge,
            'Quilometragem: ${formatKm(revision.mileage)}',
          ),
          if ((revision.generalNotes ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            const UpperLabel('Observações gerais'),
            const SizedBox(height: 2),
            Text(revision.generalNotes!),
          ],
          if ((revision.recommendations ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            const UpperLabel('Recomendações'),
            const SizedBox(height: 2),
            Text(revision.recommendations!),
          ],
        ],
      ),
      if (mechanic != null)
        _Section(
          icon: LucideIcons.userCog,
          title: 'Mecânico Responsável',
          children: [
            _Strong(mechanic.name),
            _Muted(mechanic.email),
            const SizedBox(height: 6),
            const Align(
              alignment: Alignment.centerLeft,
              child: StatusChip('Mecânico', tone: StatusTone.dark),
            ),
          ],
        ),
    ];
  }

  List<Widget> _checklist(Revision revision) {
    final evaluated = revision.checks
        .where((entry) => entry.status != CheckStatus.notChecked)
        .toList();
    if (evaluated.isEmpty) {
      return const [
        EmptyState(
          icon: LucideIcons.clipboardList,
          message: 'Nenhum item avaliado nesta revisão.',
        ),
      ];
    }
    final grouped = <String, List<CheckEntry>>{};
    for (final entry in evaluated) {
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
        ('Revisão criada', revision.createdAt!, LucideIcons.filePlus),
      if (revision.date != null)
        ('Data da revisão', revision.date!, LucideIcons.calendar),
      if (revision.completedAt != null)
        ('Revisão concluída', revision.completedAt!, LucideIcons.circleCheck),
    ];
    if (events.isEmpty) {
      return const [
        EmptyState(icon: LucideIcons.history, message: 'Sem histórico.'),
      ];
    }
    return [
      _Section(
        title: 'Histórico',
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
