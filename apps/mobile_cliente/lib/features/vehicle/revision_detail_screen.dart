import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';

/// Detalhe da revisão como o cliente vê no PWA: `RevisionDetailsModal` com
/// `exportScope="customer"` (aberto por `CustomerRevisions`). Abas Detalhes,
/// Checklist e Histórico, e "Exportar PDF" no rodapé. Diferença mantida: o
/// app mostra o nome do mecânico, que o PWA deixa de mostrar por defeito.
class RevisionDetailScreen extends ConsumerStatefulWidget {
  const RevisionDetailScreen({super.key, required this.revision});

  final Revision revision;

  @override
  ConsumerState<RevisionDetailScreen> createState() =>
      _RevisionDetailScreenState();
}

const _statusLabels = {
  'DRAFT': ('Rascunho', StatusTone.neutral, LucideIcons.circle),
  'IN_PROGRESS': ('Em Andamento', StatusTone.info, LucideIcons.clock),
  'COMPLETED': ('Concluída', StatusTone.success, LucideIcons.circleCheck),
  'CANCELLED': ('Cancelada', StatusTone.danger, LucideIcons.circleX),
};

/// Rótulo, cor e ícone de cada item (`checklistStatusConfig`).
const _checkStyles = {
  'OK': ('OK', StatusTone.success, LucideIcons.circleCheck, Color(0xFF16A34A)),
  'ATTENTION': (
    'Atenção',
    StatusTone.warning,
    LucideIcons.triangleAlert,
    Color(0xFFCA8A04)
  ),
  'CRITICAL': ('Crítico', StatusTone.danger, LucideIcons.circleX, Color(0xFFDC2626)),
  'NOT_APPLICABLE': (
    'Não Aplicável',
    StatusTone.neutral,
    LucideIcons.circleMinus,
    Color(0xFF9CA3AF)
  ),
};

String _short(DateTime? date) =>
    date == null ? '-' : DateFormat('dd/MM/yyyy HH:mm', 'pt_BR').format(date);

String _long(DateTime? date) => date == null
    ? '-'
    : DateFormat("dd 'de' MMMM 'de' yyyy 'às' HH:mm", 'pt_BR').format(date);

class _RevisionDetailScreenState extends ConsumerState<RevisionDetailScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final revision = widget.revision;
    final (label, tone, _) =
        _statusLabels[revision.status] ?? _statusLabels['DRAFT']!;
    final shortId =
        revision.id.length > 8 ? revision.id.substring(0, 8) : revision.id;

    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Detalhes da Revisão'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          PanelPageHeader(
            icon: LucideIcons.fileText,
            title: 'Revisão #$shortId',
            description: 'Criada em ${_short(revision.createdAt)}',
            badge: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 16),
          WorkspaceTabs(
            expand: true,
            tabs: const [
              WorkspaceTab('Detalhes'),
              WorkspaceTab('Checklist'),
              WorkspaceTab('Histórico'),
            ],
            index: _tab,
            onChanged: (index) => setState(() => _tab = index),
          ),
          const SizedBox(height: 16),
          ...switch (_tab) {
            1 => _checklist(revision),
            2 => _history(revision),
            _ => _details(revision),
          },
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: DownloadButton(
              label: 'Exportar PDF',
              busyLabel: 'Gerando PDF...',
              icon: LucideIcons.download,
              path: '/customer-revisions/${revision.id}/export-pdf',
              data: const <String, dynamic>{},
              fallbackName: 'revisao.pdf',
              success: 'PDF gerado',
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _spaced(List<Widget> items) => [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(height: 16),
          items[i],
        ],
      ];

  List<Widget> _details(Revision revision) {
    final customer = ref.watch(authControllerProvider).customer;
    final vehicle = revision.vehicle;
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);
    const strong = TextStyle(fontWeight: FontWeight.w600);

    Widget line(IconData icon, String label, String value) => Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 16, color: AppTheme.mutedForeground),
              const SizedBox(width: 8),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    text: '$label ',
                    style: muted,
                    children: [
                      TextSpan(
                        text: value,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          color: AppTheme.slate950,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );

    return _spaced([
      _Section(
        icon: LucideIcons.user,
        title: 'Cliente',
        children: [
          Text(customer?.name ?? '-', style: strong),
          if ((customer?.email ?? '').isNotEmpty) Text(customer!.email, style: muted),
          if ((customer?.phone ?? '').isNotEmpty) Text(customer!.phone, style: muted),
        ],
      ),
      _Section(
        icon: LucideIcons.car,
        title: 'Veículo',
        children: [
          Text(vehicle?.label ?? '-', style: strong),
          if (vehicle != null) ...[
            Text('Ano: ${vehicle.year}', style: muted),
            Text('Placa: ${vehicle.plate}', style: muted),
            if (vehicle.color.isNotEmpty) Text('Cor: ${vehicle.color}', style: muted),
          ],
        ],
      ),
      _Section(
        title: 'Informações da Revisão',
        children: [
          line(LucideIcons.calendar, 'Data:', _long(revision.date)),
          if (revision.mileage != null)
            line(LucideIcons.gauge, 'Quilometragem:', formatKm(revision.mileage)),
          if (revision.completedAt != null)
            line(LucideIcons.circleCheck, 'Concluída em:',
                _long(revision.completedAt)),
        ],
      ),
      _Section(
        icon: LucideIcons.userCog,
        title: 'Mecânico Responsável',
        children: [
          if ((revision.mechanicName ?? '').isEmpty)
            const Text('Nenhum mecânico atribuído', style: muted)
          else ...[
            Text(
              revision.mechanicName!,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            if (revision.assignedAt != null)
              Text('Atribuído em ${_short(revision.assignedAt)}', style: muted),
            if ((revision.mechanicNotes ?? '').isNotEmpty) ...[
              const SizedBox(height: 8),
              NoticeBox(
                icon: LucideIcons.messageSquare,
                tone: StatusTone.neutral,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Observações do Mecânico:',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(revision.mechanicNotes!),
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
          children: [Text(revision.generalNotes!, style: const TextStyle(fontSize: 14))],
        ),
      if ((revision.recommendations ?? '').isNotEmpty)
        _Section(
          title: 'Recomendações',
          children: [
            Text(revision.recommendations!, style: const TextStyle(fontSize: 14)),
          ],
        ),
    ]);
  }

  List<Widget> _checklist(Revision revision) {
    if (revision.checks.isEmpty) {
      return [
        EmptyState(
          icon: LucideIcons.circleAlert,
          title: 'Nenhum item no checklist',
          message: 'Esta revisão ainda não possui dados de checklist',
          action: revision.status == 'DRAFT'
              ? const Text(
                  'Status: Rascunho - Aguardando preenchimento',
                  style: TextStyle(color: AppTheme.primary),
                )
              : null,
        ),
      ];
    }
    final byCategory = <String, List<RevisionCheck>>{};
    for (final check in revision.checks) {
      byCategory.putIfAbsent(check.category, () => []).add(check);
    }
    return _spaced([
      for (final entry in byCategory.entries)
        _Section(
          title: entry.key,
          children: [
            for (final check in entry.value) _CheckRow(check: check),
          ],
        ),
    ]);
  }

  List<Widget> _history(Revision revision) {
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);

    Widget event(IconData icon, Color color, String title, DateTime? at) =>
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: color.withValues(alpha: 0.15),
                child: Icon(icon, size: 16, color: color),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                  Text(_short(at), style: muted),
                ],
              ),
            ],
          ),
        );

    return _spaced([
      if (revision.transfers.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Text(
            'Nenhuma transferência registrada',
            textAlign: TextAlign.center,
            style: muted,
          ),
        )
      else
        _Section(
          icon: LucideIcons.arrowRightLeft,
          title: 'Histórico de Transferências',
          children: [
            for (final transfer in revision.transfers)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: NoticeBox(
                  icon: LucideIcons.arrowRightLeft,
                  tone: StatusTone.neutral,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('De ${transfer.from} para ${transfer.to}',
                          style: const TextStyle(fontWeight: FontWeight.w500)),
                      Text(_short(transfer.at), style: muted),
                      if ((transfer.reason ?? '').isNotEmpty)
                        Text('Motivo: ${transfer.reason}', style: muted),
                    ],
                  ),
                ),
              ),
          ],
        ),
      _Section(
        icon: LucideIcons.clock,
        title: 'Timeline',
        children: [
          event(LucideIcons.circle, AppTheme.success, 'Revisão Criada',
              revision.createdAt),
          if (revision.assignedAt != null)
            event(LucideIcons.userCog, const Color(0xFF2563EB),
                'Mecânico Atribuído', revision.assignedAt),
          if (revision.completedAt != null)
            event(LucideIcons.circleCheck, AppTheme.success,
                'Revisão Concluída', revision.completedAt),
        ],
      ),
    ]);
  }
}

/// Cartão de seção (`Card` com `CardTitle` do modal).
class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children, this.icon});

  final String title;
  final IconData? icon;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(title, style: Theme.of(context).textTheme.titleMedium),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.check});

  final RevisionCheck check;

  @override
  Widget build(BuildContext context) {
    final (label, tone, icon, color) = _checkStyles[check.status] ??
        ('Não Verificado', StatusTone.neutral, LucideIcons.circle,
            const Color(0xFF9CA3AF));
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  check.name,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                ),
                if ((check.notes ?? '').isNotEmpty)
                  Text(
                    check.notes!,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StatusChip(label, tone: tone),
        ],
      ),
    );
  }
}
