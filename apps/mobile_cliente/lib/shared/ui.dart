import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

/// Peças repetidas nas telas do cliente, copiadas dos componentes do PWA.

/// Campo com ícone à esquerda (`Input` com `pl-10` e ícone absoluto).
InputDecoration iconInput(IconData icon, String hint) => InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, size: 16),
    );

/// Busca dos filtros (ícone de lupa e dica).
class SearchBox extends StatelessWidget {
  const SearchBox({
    super.key,
    required this.hint,
    required this.onChanged,
    this.controller,
  });

  final String hint;
  final ValueChanged<String> onChanged;
  final TextEditingController? controller;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hint,
        fillColor: Colors.white.withValues(alpha: 0.85),
        prefixIcon: const Icon(LucideIcons.search, size: 16),
      ),
    );
  }
}

/// Seletor de filtro com aparência de `Select` do PWA.
class FilterSelect<T> extends StatelessWidget {
  const FilterSelect({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final T value;
  final Map<T, String> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      value: value,
      isExpanded: true,
      icon: const Icon(LucideIcons.chevronDown, size: 16),
      decoration: InputDecoration(
        fillColor: Colors.white.withValues(alpha: 0.85),
      ),
      style: const TextStyle(
        fontFamily: AppTheme.bodyFont,
        fontSize: 14,
        color: AppTheme.foreground,
      ),
      items: [
        for (final entry in options.entries)
          DropdownMenuItem(value: entry.key, child: Text(entry.value)),
      ],
      onChanged: (value) {
        if (value != null) onChanged(value);
      },
    );
  }
}

/// Cartão com busca e filtro, como o bloco de filtros dos pedidos.
class FiltersCard extends StatelessWidget {
  const FiltersCard({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            children[i],
          ],
        ],
      ),
    );
  }
}

/// Selo preto da placa.
class PlateChip extends StatelessWidget {
  const PlateChip(this.plate, {super.key});

  final String plate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.slate950,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        plate,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

/// Caixa com rótulo em caixa alta e valor (`HORARIO CONFIRMADO`, `TOTAL`).
class LabeledBox extends StatelessWidget {
  const LabeledBox({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
    this.borderColor,
    this.valueStyle,
  });

  final String label;
  final String value;
  final IconData? icon;
  final Color? color;
  final Color? borderColor;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color ?? const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor ?? AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: AppTheme.mutedForeground),
                const SizedBox(width: 6),
              ],
              Flexible(
                child: Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.6,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: valueStyle ??
                const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.slate950,
                ),
          ),
        ],
      ),
    );
  }
}

/// Linha cinza de item (`bg-gray-100` nos itens do pedido).
class ItemLine extends StatelessWidget {
  const ItemLine({super.key, required this.name, required this.trailing});

  final String name;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFE5E7EB),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              name,
              style: const TextStyle(fontSize: 13, color: AppTheme.slate950),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            trailing,
            style: const TextStyle(fontSize: 13, color: AppTheme.slate950),
          ),
        ],
      ),
    );
  }
}

/// Linha com ícone pequeno e texto cinza ("Pagamento: PIX").
class MetaLine extends StatelessWidget {
  const MetaLine(this.icon, this.text, {super.key});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.mutedForeground),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.mutedForeground,
            ),
          ),
        ),
      ],
    );
  }
}

/// Título de cartão com ícone (`CardTitle` com ícone à esquerda).
class CardHeading extends StatelessWidget {
  const CardHeading({
    super.key,
    required this.title,
    this.icon,
    this.description,
    this.trailing,
  });

  final String title;
  final IconData? icon;
  final String? description;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
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
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ],
              ),
              if (description != null) ...[
                const SizedBox(height: 4),
                Text(
                  description!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    );
  }
}

/// Aviso com borda e fundo coloridos (alertas da revisão, dicas).
class NoticeBox extends StatelessWidget {
  const NoticeBox({
    super.key,
    required this.icon,
    required this.child,
    this.tone = StatusTone.info,
  });

  final IconData icon;
  final Widget child;
  final StatusTone tone;

  static const _palette = {
    StatusTone.info: (Color(0xFFEFF6FF), Color(0xFFBFDBFE), Color(0xFF1E3A8A)),
    StatusTone.danger: (Color(0xFFFEF2F2), Color(0xFFFCA5A5), Color(0xFF7F1D1D)),
    StatusTone.warning: (Color(0xFFFEFCE8), Color(0xFFFDE047), Color(0xFF713F12)),
    StatusTone.success: (Color(0xFFF0FDF4), Color(0xFFBBF7D0), Color(0xFF14532D)),
    StatusTone.neutral: (Colors.white, AppTheme.border, AppTheme.slate950),
  };

  @override
  Widget build(BuildContext context) {
    final (background, border, foreground) =
        _palette[tone] ?? _palette[StatusTone.neutral]!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: foreground),
          const SizedBox(width: 10),
          Expanded(
            child: DefaultTextStyle.merge(
              style: TextStyle(fontSize: 14, color: foreground, height: 1.45),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

/// Botão vermelho contornado ("Remover", "Rejeitar").
ButtonStyle dangerOutline() => OutlinedButton.styleFrom(
      foregroundColor: AppTheme.danger,
      side: const BorderSide(color: AppTheme.primary),
    );

/// Botão verde cheio ("Aprovar e Virar Pedido").
ButtonStyle successFilled() => FilledButton.styleFrom(
      backgroundColor: AppTheme.success,
      foregroundColor: Colors.white,
    );

/// Formulário de tela interna: cabeçalho de seção e campos num cartão.
class FormPage extends StatelessWidget {
  const FormPage({
    super.key,
    required this.title,
    required this.children,
    this.header,
    this.actions = const [],
    this.formKey,
  });

  final String title;
  final Widget? header;
  final List<Widget> children;
  final List<Widget> actions;
  final GlobalKey<FormState>? formKey;

  @override
  Widget build(BuildContext context) {
    final list = ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        if (header != null) ...[header!, const SizedBox(height: 16)],
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) const SizedBox(height: 16),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
    return PanelScaffold(
      appBar: PanelAppBar(title: title, actions: actions),
      body: formKey == null ? list : Form(key: formKey, child: list),
    );
  }
}
