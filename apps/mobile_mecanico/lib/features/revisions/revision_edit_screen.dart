import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/revision_rules.dart';
import 'budget_screen.dart';
import 'checklist_row.dart';

/// Preenchimento do checklist. O catálogo tem mais de 170 itens, por isso a
/// lista é construída sob demanda e cada categoria abre só quando pedida.
class RevisionEditScreen extends ConsumerStatefulWidget {
  const RevisionEditScreen({super.key, required this.revisionId});

  final String revisionId;

  @override
  ConsumerState<RevisionEditScreen> createState() => _RevisionEditScreenState();
}

class _RevisionEditScreenState extends ConsumerState<RevisionEditScreen> {
  final _search = TextEditingController();
  final _mileage = TextEditingController();
  final _generalNotes = TextEditingController();
  final _recommendations = TextEditingController();

  Revision? _revision;
  List<CheckEntry> _entries = const [];
  final Set<String> _openCategories = {};
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

  /// Linhas da lista: com busca, só os itens que casam; sem busca, as
  /// categorias e os itens das que estão abertas.
  List<Object> _rows() {
    final term = withoutAccents(_search.text);
    if (term.isNotEmpty) {
      return _entries
          .where(
            (entry) =>
                withoutAccents(entry.itemName).contains(term) ||
                withoutAccents(entry.categoryName).contains(term),
          )
          .toList();
    }
    final grouped = <String, List<CheckEntry>>{};
    for (final entry in _entries) {
      grouped.putIfAbsent(entry.categoryName, () => []).add(entry);
    }
    return [
      for (final group in grouped.entries) ...[
        _CategoryRow(group.key, group.value),
        if (_openCategories.contains(group.key)) ...group.value,
      ],
    ];
  }

  @override
  Widget build(BuildContext context) {
    final revision = _revision;
    if (revision == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Revisão')),
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
    final rows = _rows();
    const headerCount = 2;

    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(revision.vehicle?.label ?? 'Revisão'),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(32),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${progress.checked} de ${progress.total} itens avaliados',
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(value: progress.ratio),
                ],
              ),
            ),
          ),
        ),
        bottomNavigationBar: _readOnly
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving
                              ? null
                              : () => _save('DRAFT', 'Rascunho salvo'),
                          child: const Text('Rascunho'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving
                              ? null
                              : () => _save('IN_PROGRESS', 'Revisão salva'),
                          child: const Text('Andamento'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: BusyButton(
                          label: 'Finalizar',
                          busy: _saving,
                          onPressed:
                              progress.checked == 0 ? null : _openBudget,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        body: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: rows.length + headerCount,
          itemBuilder: (context, index) {
            if (index == 0) {
              return _InfoCard(
                revision: revision,
                mileage: _mileage,
                generalNotes: _generalNotes,
                recommendations: _recommendations,
                readOnly: _readOnly,
                onChanged: () => _dirty = true,
              );
            }
            if (index == 1) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: 'Buscar item (ex.: freio, óleo)',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _search.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Limpar busca',
                            icon: const Icon(Icons.close),
                            onPressed: () => setState(_search.clear),
                          ),
                  ),
                ),
              );
            }
            final row = rows[index - headerCount];
            if (row is _CategoryRow) {
              final open = _openCategories.contains(row.name);
              final done = ChecklistProgress.of(row.entries);
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(row.name),
                subtitle: Text('${done.checked} de ${done.total} avaliados'),
                trailing: Icon(open ? Icons.expand_less : Icons.expand_more),
                onTap: () => setState(() {
                  open
                      ? _openCategories.remove(row.name)
                      : _openCategories.add(row.name);
                }),
              );
            }
            final entry = row as CheckEntry;
            return ChecklistRow(
              key: ValueKey(entry.itemId),
              entry: entry,
              readOnly: _readOnly,
              onChanged: _updateEntry,
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

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.revision,
    required this.mileage,
    required this.generalNotes,
    required this.recommendations,
    required this.readOnly,
    required this.onChanged,
  });

  final Revision revision;
  final TextEditingController mileage;
  final TextEditingController generalNotes;
  final TextEditingController recommendations;
  final bool readOnly;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = revision.statusView;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        title: Text(revision.customer?.name ?? 'Cliente'),
        subtitle: Text(revision.vehicle?.plate ?? ''),
        trailing: StatusChip(label, tone: tone),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          TextField(
            controller: mileage,
            enabled: !readOnly,
            keyboardType: TextInputType.number,
            onChanged: (_) => onChanged(),
            decoration: const InputDecoration(labelText: 'Quilometragem'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: generalNotes,
            enabled: !readOnly,
            maxLines: 2,
            onChanged: (_) => onChanged(),
            decoration: const InputDecoration(labelText: 'Observações gerais'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: recommendations,
            enabled: !readOnly,
            maxLines: 2,
            onChanged: (_) => onChanged(),
            decoration: const InputDecoration(
              labelText: 'Recomendações para o cliente',
            ),
          ),
        ],
      ),
    );
  }
}
