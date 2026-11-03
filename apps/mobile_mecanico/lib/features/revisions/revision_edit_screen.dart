import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/revision_rules.dart';
import '../../shared/ui.dart';
import 'budget_screen.dart';
import 'checklist_row.dart';

/// Preenchimento do checklist, no formato de `RevisionEditPage` +
/// `StepChecklist` do PWA. O catálogo tem mais de 170 itens, por isso a lista
/// é construída sob demanda e cada categoria abre só quando pedida.
class RevisionEditScreen extends ConsumerStatefulWidget {
  const RevisionEditScreen({
    super.key,
    required this.revisionId,
    this.openBudget = false,
  });

  final String revisionId;

  /// "Concluir" no cartão: abre direto o orçamento depois de carregar.
  final bool openBudget;

  @override
  ConsumerState<RevisionEditScreen> createState() => _RevisionEditScreenState();
}

class _RevisionEditScreenState extends ConsumerState<RevisionEditScreen> {
  final _search = TextEditingController();
  final _mileage = TextEditingController();
  final _generalNotes = TextEditingController();
  final _recommendations = TextEditingController();
  final _scroll = ScrollController();
  final _cardKey = GlobalKey();

  Revision? _revision;
  List<CheckEntry> _entries = const [];
  final Set<String> _openCategories = {};
  CheckEntry? _editing;
  bool _editingInfo = false;
  bool _evaluatedOpen = false;
  Object? _loadError;
  bool _saving = false;
  bool _dirty = false;

  bool get _readOnly => _revision?.isClosed ?? false;
  int get _mileageValue => int.tryParse(_mileage.text.trim()) ?? 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    _mileage.dispose();
    _generalNotes.dispose();
    _recommendations.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    try {
      final api = ref.read(apiProvider);
      final catalog = api.checklist();
      final revision = await api.revision(widget.revisionId);
      final categories = await catalog;
      if (!mounted) return;
      setState(() {
        _revision = revision;
        _entries = revision.isClosed
            ? revision.checks
            : mergeCatalog(revision.checks, categories);
        _mileage.text = revision.mileage?.toString() ?? '';
        _generalNotes.text = revision.generalNotes ?? '';
        _recommendations.text = revision.recommendations ?? '';
      });
      if (widget.openBudget && !revision.isClosed) {
        if (ChecklistProgress.of(_entries).checked == 0) {
          showMessage(
            context,
            'Avalie ao menos um item antes de concluir.',
            error: true,
          );
        } else {
          _openBudget();
        }
      }
    } catch (error) {
      if (mounted) setState(() => _loadError = error);
    }
  }

  void _updateEntry(CheckEntry entry) {
    setState(() {
      _dirty = true;
      _entries = [
        for (final current in _entries)
          current.itemId == entry.itemId ? entry : current,
      ];
    });
  }

  /// Abre o cartão de avaliação e rola até ele.
  void _evaluate(CheckEntry entry) {
    if (_readOnly) return;
    setState(() {
      _editing = entry;
      _search.clear();
    });
    _scroll.jumpTo(0);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = _cardKey.currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 250),
          alignment: 0.1,
        );
      }
    });
  }

  Map<String, dynamic> _payload(String status) => {
        'status': status,
        'checklistItems': [for (final entry in _entries) entry.toJson()],
        'mileage': _mileageValue,
        'generalNotes': _generalNotes.text.trim(),
        'recommendations': _recommendations.text.trim(),
      };

  Future<void> _save(String status, String message) async {
    setState(() => _saving = true);
    final done = await runAction(
      context,
      () => ref
          .read(apiProvider)
          .saveRevision(widget.revisionId, _payload(status)),
      success: message,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (done) {
      _dirty = false;
      Navigator.of(context).pop();
    }
  }

  Future<void> _openBudget() async {
    final finished = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => BudgetScreen(
          revision: _revision!,
          entries: _entries,
          mileage: _mileageValue,
          payload: _payload('IN_PROGRESS'),
        ),
      ),
    );
    if (finished == true && mounted) {
      _dirty = false;
      Navigator.of(context).pop();
    }
  }

  Future<void> _leave() async {
    final navigator = Navigator.of(context);
    final accepted = await confirm(
      context,
      title: 'Sair sem salvar?',
      message: 'As avaliações feitas desde o último salvamento serão perdidas.',
      confirmLabel: 'Sair sem salvar',
      destructive: true,
    );
    if (accepted) {
      _dirty = false;
      navigator.pop();
    }
  }

  /// Linhas de "Todos os itens": categorias e, nas abertas, os itens.
  List<Object> _rows() {
    final grouped = <String, List<CheckEntry>>{};
    for (final entry in _entries) {
      grouped.putIfAbsent(entry.categoryName, () => []).add(entry);
    }
    return [
      for (final group in grouped.entries) ...[
        _CategoryRow(group.key, group.value),
        if (_openCategories.contains(group.key))
          for (var i = 0; i < group.value.length; i++)
            _ItemRow(group.value[i], last: i == group.value.length - 1),
      ],
    ];
  }

  List<CheckEntry> _matches() {
    final term = withoutAccents(_search.text);
    if (term.isEmpty) return const [];
    return _entries
        .where(
          (entry) =>
              withoutAccents(entry.itemName).contains(term) ||
              withoutAccents(entry.categoryName).contains(term),
        )
        .take(8)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final revision = _revision;
    if (revision == null) {
      return PanelScaffold(
        appBar: const PanelAppBar(title: 'Revisão'),
        body: _loadError == null
            ? const Center(child: CircularProgressIndicator())
            : Center(
                child: ErrorState(
                  message: friendlyError(_loadError),
                  onRetry: _load,
                ),
              ),
      );
    }

    final progress = ChecklistProgress.of(_entries);
    final evaluated =
        _entries.where((e) => e.status != CheckStatus.notChecked).toList();
    final problems = evaluated.where((e) => e.status.isProblem).length;
    final rows = _rows();
    final header = <Widget>[
      Text(
        '${revision.customer?.name ?? 'Cliente'} - '
        '${revision.vehicle?.label ?? 'Veículo'} '
        '(${revision.vehicle?.plate ?? ''})',
        style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
      ),
      if (progress.total > 0) _ProgressCard(progress: progress),
      _InfoCard(
        editing: _editingInfo,
        readOnly: _readOnly,
        mileage: _mileage,
        generalNotes: _generalNotes,
        recommendations: _recommendations,
        onToggle: () => setState(() => _editingInfo = !_editingInfo),
        onChanged: () => _dirty = true,
      ),
      if (!_readOnly) ...[
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'O que você verificou?',
              style: TextStyle(
                fontFamily: AppTheme.headingFont,
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.slate950,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Digite o que observou — por exemplo "freio" — e marque o '
              'estado. O que não for verificado fica registrado como tal.',
              style: TextStyle(fontSize: 14, color: AppTheme.mutedForeground),
            ),
          ],
        ),
        _SearchCard(
          controller: _search,
          matches: _matches(),
          onChanged: () => setState(() {}),
          onPick: _evaluate,
        ),
      ],
      if (_editing != null)
        EvaluationCard(
          key: _cardKey,
          entry: _editing!,
          onClose: () => setState(() => _editing = null),
          onConfirm: (entry) {
            _updateEntry(entry);
            setState(() => _editing = null);
          },
        ),
      if (evaluated.isNotEmpty)
        _EvaluatedPanel(
          entries: evaluated,
          open: _evaluatedOpen,
          readOnly: _readOnly,
          onToggle: () => setState(() => _evaluatedOpen = !_evaluatedOpen),
          onReopen: _evaluate,
          onClear: (entry) =>
              _updateEntry(entry.copyWith(status: CheckStatus.notChecked)),
        )
      else
        const DashedBox(
          child: Center(
            child: Text(
              'Nenhum item avaliado ainda.',
              style: TextStyle(fontSize: 14, color: AppTheme.mutedForeground),
            ),
          ),
        ),
      const Padding(
        padding: EdgeInsets.only(top: 4),
        child: UpperLabel('Todos os itens'),
      ),
    ];

    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: PanelScaffold(
        appBar: PanelAppBar(
          title: revision.status == 'DRAFT'
              ? 'Editar Rascunho'
              : _readOnly
                  ? 'Revisão'
                  : 'Continuar Revisão',
        ),
        bottomNavigationBar: _readOnly
            ? null
            : _BottomActions(
                evaluated: progress.checked,
                problems: problems,
                saving: _saving,
                onCancel: () => Navigator.of(context).maybePop(),
                onDraft: () => _save('DRAFT', 'Rascunho salvo'),
                onProgress: () => _save('IN_PROGRESS', 'Revisão salva'),
                onFinish: progress.checked == 0 ? null : _openBudget,
              ),
        body: ListView.builder(
          controller: _scroll,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          itemCount: header.length + rows.length,
          itemBuilder: (context, index) {
            if (index < header.length) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: header[index],
              );
            }
            final row = rows[index - header.length];
            if (row is _CategoryRow) {
              return _CategoryTile(
                row: row,
                open: _openCategories.contains(row.name),
                onTap: () => setState(() {
                  _openCategories.contains(row.name)
                      ? _openCategories.remove(row.name)
                      : _openCategories.add(row.name);
                }),
              );
            }
            final item = row as _ItemRow;
            return _ItemTile(
              key: ValueKey(item.entry.itemId),
              entry: item.entry,
              last: item.last,
              onTap: () => _evaluate(item.entry),
            );
          },
        ),
      ),
    );
  }
}

class _CategoryRow {
  const _CategoryRow(this.name, this.entries);

  final String name;
  final List<CheckEntry> entries;
}

class _ItemRow {
  const _ItemRow(this.entry, {required this.last});

  final CheckEntry entry;
  final bool last;
}

/// Progresso que muda de cor conforme avança (azul, laranja, lima, verde).
class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.progress});

  final ChecklistProgress progress;

  @override
  Widget build(BuildContext context) {
    final percentage = (progress.ratio * 100).round();
    final (bar, text, border, fill) = percentage == 100
        ? (
            const Color(0xFF10B981),
            const Color(0xFF047857),
            const Color(0xFFA7F3D0),
            const Color(0xFFECFDF5),
          )
        : percentage >= 70
            ? (
                const Color(0xFF84CC16),
                const Color(0xFF4D7C0F),
                const Color(0xFFD9F99D),
                const Color(0xFFF7FEE7),
              )
            : percentage >= 35
                ? (
                    const Color(0xFFF97316),
                    const Color(0xFFC2410C),
                    const Color(0xFFFED7AA),
                    const Color(0xFFFFF7ED),
                  )
                : (
                    const Color(0xFF3B82F6),
                    const Color(0xFF1D4ED8),
                    const Color(0xFFBFDBFE),
                    const Color(0xFFEFF6FF),
                  );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: fill.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  percentage == 100 ? LucideIcons.check : LucideIcons.gauge,
                  size: 20,
                  color: text,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      percentage == 100
                          ? 'Revisão concluída'
                          : '$percentage% concluído',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: text,
                      ),
                    ),
                    Text(
                      '${progress.checked} de ${progress.total} itens avaliados',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress.ratio,
              minHeight: 12,
              color: bar,
              backgroundColor: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Informações da Revisão": resumo em três caixas, ou o formulário.
class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.editing,
    required this.readOnly,
    required this.mileage,
    required this.generalNotes,
    required this.recommendations,
    required this.onToggle,
    required this.onChanged,
  });

  final bool editing;
  final bool readOnly;
  final TextEditingController mileage;
  final TextEditingController generalNotes;
  final TextEditingController recommendations;
  final VoidCallback onToggle;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final km = int.tryParse(mileage.text.trim()) ?? 0;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Informações da Revisão',
                        style: TextStyle(
                          fontFamily: AppTheme.headingFont,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.slate950,
                        ),
                      ),
                      if (!editing)
                        const Text(
                          'Dados gerais do atendimento',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                    ],
                  ),
                ),
                if (!readOnly)
                  editing
                      ? TextButton.icon(
                          onPressed: onToggle,
                          icon: const Icon(LucideIcons.x, size: 14),
                          label: const Text('Fechar edição'),
                        )
                      : OutlinedButton.icon(
                          style: compact(null),
                          onPressed: onToggle,
                          icon: const Icon(LucideIcons.pencil, size: 14),
                          label: const Text('Editar dados'),
                        ),
              ],
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(12),
            child: editing
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FormInput(
                        label: 'Quilometragem',
                        controller: mileage,
                        hint: '0',
                        keyboardType: TextInputType.number,
                        onChanged: (_) => onChanged(),
                      ),
                      const SizedBox(height: 12),
                      FormInput(
                        label: 'Observações Gerais',
                        controller: generalNotes,
                        hint: 'Observações...',
                        maxLines: 2,
                        capitalization: TextCapitalization.sentences,
                        onChanged: (_) => onChanged(),
                      ),
                      const SizedBox(height: 12),
                      FormInput(
                        label: 'Recomendações',
                        controller: recommendations,
                        hint: 'Recomendações para o cliente...',
                        maxLines: 2,
                        capitalization: TextCapitalization.sentences,
                        onChanged: (_) => onChanged(),
                      ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.icon(
                          onPressed: onToggle,
                          icon: const Icon(LucideIcons.check),
                          label: const Text('Concluir edição'),
                        ),
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _InfoBox(
                        'Quilometragem',
                        km == 0 ? 'Não informada' : formatKm(km),
                        bold: true,
                      ),
                      const SizedBox(height: 8),
                      _InfoBox(
                        'Observações gerais',
                        generalNotes.text.trim().isEmpty
                            ? 'Nenhuma observação'
                            : generalNotes.text.trim(),
                      ),
                      const SizedBox(height: 8),
                      _InfoBox(
                        'Recomendações',
                        recommendations.text.trim().isEmpty
                            ? 'Nenhuma recomendação'
                            : recommendations.text.trim(),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  const _InfoBox(this.label, this.value, {this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          UpperLabel(label),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

/// Busca em destaque com as sugestões logo abaixo do campo.
class _SearchCard extends StatelessWidget {
  const _SearchCard({
    required this.controller,
    required this.matches,
    required this.onChanged,
    required this.onPick,
  });

  final TextEditingController controller;
  final List<CheckEntry> matches;
  final VoidCallback onChanged;
  final ValueChanged<CheckEntry> onPick;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primary.withValues(alpha: 0.4),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Buscar item para avaliar',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            onChanged: (_) => onChanged(),
            style: const TextStyle(fontSize: 16),
            decoration: InputDecoration(
              hintText: 'Buscar item: freio, óleo, pneu...',
              hintStyle: const TextStyle(
                fontSize: 16,
                color: AppTheme.mutedForeground,
              ),
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(vertical: 17),
              prefixIcon: const Padding(
                padding: EdgeInsets.only(left: 12, right: 8),
                child: Icon(
                  LucideIcons.search,
                  size: 24,
                  color: AppTheme.primary,
                ),
              ),
              suffixIcon: controller.text.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Limpar busca',
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () {
                        controller.clear();
                        onChanged();
                      },
                    ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: AppTheme.border, width: 2),
              ),
            ),
          ),
          if (matches.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                children: [
                  for (final entry in matches)
                    InkWell(
                      onTap: () => onPick(entry),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    entry.itemName,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    entry.categoryName,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.mutedForeground,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (entry.status != CheckStatus.notChecked)
                              const Icon(
                                LucideIcons.check,
                                size: 16,
                                color: green600,
                              ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          const Text(
            'Digite o nome do componente ou da categoria para localizar '
            'rapidamente.',
            style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
          ),
        ],
      ),
    );
  }
}

/// "Itens já avaliados", recolhível.
class _EvaluatedPanel extends StatelessWidget {
  const _EvaluatedPanel({
    required this.entries,
    required this.open,
    required this.readOnly,
    required this.onToggle,
    required this.onReopen,
    required this.onClear,
  });

  final List<CheckEntry> entries;
  final bool open;
  final bool readOnly;
  final VoidCallback onToggle;
  final ValueChanged<CheckEntry> onReopen;
  final ValueChanged<CheckEntry> onClear;

  @override
  Widget build(BuildContext context) {
    final count = entries.length;
    return GlassCard(
      padding: EdgeInsets.zero,
      radius: 12,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Itens já avaliados',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '$count ${count == 1 ? 'item' : 'itens'} · '
                          'clique para ${open ? 'recolher' : 'expandir'}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    open ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
          if (open)
            for (final entry in entries) ...[
              const Divider(),
              EvaluatedRow(
                entry: entry,
                onReopen: () => onReopen(entry),
                onClear: readOnly ? null : () => onClear(entry),
              ),
            ],
        ],
      ),
    );
  }
}

/// Cabeçalho de categoria com o contador preto de itens avaliados.
class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.row,
    required this.open,
    required this.onTap,
  });

  final _CategoryRow row;
  final bool open;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final checked = ChecklistProgress.of(row.entries).checked;
    final radius = open
        ? const BorderRadius.vertical(top: Radius.circular(8))
        : BorderRadius.circular(8);
    return Padding(
      padding: EdgeInsets.only(top: 8, bottom: open ? 0 : 0),
      child: Material(
        color: open
            ? AppTheme.muted.withValues(alpha: 0.5)
            : Colors.white.withValues(alpha: 0.6),
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: const BorderSide(color: AppTheme.border),
        ),
        child: InkWell(
          borderRadius: radius,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    row.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (checked > 0) ...[
                  const SizedBox(width: 8),
                  CountBadge(checked),
                ],
                const Spacer(),
                AnimatedRotation(
                  turns: open ? 0.5 : 0,
                  duration: const Duration(milliseconds: 150),
                  child: const Icon(LucideIcons.chevronDown, size: 16),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ItemTile extends StatelessWidget {
  const _ItemTile({
    super.key,
    required this.entry,
    required this.last,
    required this.onTap,
  });

  final CheckEntry entry;
  final bool last;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final radius = last
        ? const BorderRadius.vertical(bottom: Radius.circular(8))
        : BorderRadius.zero;
    return Material(
      color: Colors.white.withValues(alpha: 0.75),
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: const BorderSide(color: AppTheme.border, width: 0.5),
      ),
      child: InkWell(
        borderRadius: radius,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  entry.itemName,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14),
                ),
              ),
              if (entry.status != CheckStatus.notChecked)
                const Icon(LucideIcons.check, size: 16, color: green600),
            ],
          ),
        ),
      ),
    );
  }
}

/// Rodapé fixo do checklist: resumo e as ações de salvar.
class _BottomActions extends StatelessWidget {
  const _BottomActions({
    required this.evaluated,
    required this.problems,
    required this.saving,
    required this.onCancel,
    required this.onDraft,
    required this.onProgress,
    required this.onFinish,
  });

  final int evaluated;
  final int problems;
  final bool saving;
  final VoidCallback onCancel;
  final VoidCallback onDraft;
  final VoidCallback onProgress;
  final VoidCallback? onFinish;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: frostedBarDecoration(top: false),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '$evaluated ${evaluated == 1 ? 'item avaliado' : 'itens avaliados'}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ),
                  if (problems > 0) ...[
                    const Icon(
                      LucideIcons.triangleAlert,
                      size: 16,
                      color: Color(0xFFB45309),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$problems com problema',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFFB45309),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _action(
                    OutlinedButton(
                      style: compact(null),
                      onPressed: saving ? null : onCancel,
                      child: const Text('Cancelar'),
                    ),
                  ),
                  _action(
                    OutlinedButton.icon(
                      style: compact(null),
                      onPressed: saving ? null : onDraft,
                      icon: const Icon(LucideIcons.fileText),
                      label: const Text('Rascunho'),
                    ),
                  ),
                  _action(
                    OutlinedButton.icon(
                      style: compact(null),
                      onPressed: saving ? null : onProgress,
                      icon: const Icon(LucideIcons.clock),
                      label: const Text('Andamento'),
                    ),
                  ),
                  _action(
                    FilledButton.icon(
                      style: successFilled.merge(
                        FilledButton.styleFrom(
                          minimumSize: const Size(0, 36),
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                      ),
                      onPressed: saving ? null : onFinish,
                      icon: saving
                          ? const SizedBox.square(
                              dimension: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(LucideIcons.circleCheck),
                      label: const Text('Finalizar'),
                    ),
                    last: true,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _action(Widget child, {bool last = false}) {
    return Expanded(
      child: Padding(
        padding: EdgeInsets.only(right: last ? 0 : 6),
        child: FittedBox(fit: BoxFit.scaleDown, child: child),
      ),
    );
  }
}
