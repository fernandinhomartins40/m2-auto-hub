import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

/// Peças pequenas que se repetem nas telas do mecânico, com as classes do
/// PWA de onde vieram (`bg-green-600`, `text-[11px] uppercase`...).

const green600 = Color(0xFF16A34A);
const red600 = Color(0xFFDC2626);
const amber500 = Color(0xFFF59E0B);
const gray50 = Color(0xFFF9FAFB);
const gray400 = Color(0xFF9CA3AF);
const gray600 = Color(0xFF4B5563);

/// Botão cheio verde ("Concluir", "Finalizar").
final successFilled = FilledButton.styleFrom(
  backgroundColor: green600,
  foregroundColor: Colors.white,
);

/// Contorno verde ("Concluir" do cartão de revisão).
final successOutlined = OutlinedButton.styleFrom(
  foregroundColor: green600,
  side: const BorderSide(color: green600),
);

/// Contorno vermelho ("Cancelar" do cartão).
final dangerOutlined = OutlinedButton.styleFrom(
  foregroundColor: red600,
  side: const BorderSide(color: red600),
);

/// Botões `size="sm"` do shadcn: 36 de altura, 12 de respiro lateral.
ButtonStyle compact(ButtonStyle? base) {
  return (base ?? const ButtonStyle()).merge(
    OutlinedButton.styleFrom(
      minimumSize: const Size(0, 36),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    ),
  );
}

/// Linha com ícone pequeno e texto (cliente, veículo, data).
class MetaLine extends StatelessWidget {
  const MetaLine(
    this.icon,
    this.text, {
    super.key,
    this.bold = false,
    this.size = 14,
  });

  final IconData icon;
  final String text;
  final bool bold;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: size, color: gray400),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: size,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
              color: bold ? AppTheme.slate950 : gray600,
            ),
          ),
        ),
      ],
    );
  }
}

/// Rótulo pequeno em caixa alta (`text-[11px] font-semibold uppercase`).
class UpperLabel extends StatelessWidget {
  const UpperLabel(this.text, {super.key, this.icon});

  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final label = Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.6,
        color: AppTheme.mutedForeground,
      ),
    );
    if (icon == null) return label;
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.mutedForeground),
        const SizedBox(width: 6),
        label,
      ],
    );
  }
}

/// Contador preto em pílula (categorias do checklist, filtros).
class CountBadge extends StatelessWidget {
  const CountBadge(this.count, {super.key, this.light = false});

  final int count;

  /// Branco sobre a aba ativa, como no PWA.
  final bool light;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
      decoration: BoxDecoration(
        color: AppTheme.slate950,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }
}

/// Caixa de borda tracejada para estados vazios dentro de formulários.
class DashedBox extends StatelessWidget {
  const DashedBox({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedPainter(),
      child: Padding(padding: const EdgeInsets.all(20), child: child),
    );
  }
}

class _DashedPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          const Radius.circular(8),
        ),
      );
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 8) {
        canvas.drawPath(metric.extractPath(d, d + 4), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Pontos do assistente de OS no celular: o atual vira um traço azul.
class StepDots extends StatelessWidget {
  const StepDots({super.key, required this.step, required this.total});

  final int step;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 1; i <= total; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == step ? 32 : 8,
            height: 8,
            decoration: BoxDecoration(
              color: i < step
                  ? const Color(0xFF22C55E)
                  : i == step
                      ? AppTheme.primary
                      : const Color(0xFFD1D5DB),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
      ],
    );
  }
}

/// Filtro em pílulas com contador (Todas 1 · Pendentes 0 ...).
class FilterPills extends StatelessWidget {
  const FilterPills({
    super.key,
    required this.labels,
    required this.counts,
    required this.index,
    required this.onChanged,
  });

  final List<String> labels;
  final List<int> counts;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++)
            GestureDetector(
              onTap: () => onChanged(i),
              behavior: HitTestBehavior.opaque,
              child: Container(
                height: 40,
                margin: const EdgeInsets.only(right: 4),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: i == index ? AppTheme.primary : null,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: i == index
                      ? [
                          BoxShadow(
                            color: AppTheme.primary.withValues(alpha: 0.8),
                            offset: const Offset(0, 8),
                            blurRadius: 18,
                            spreadRadius: -12,
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  children: [
                    Text(
                      labels[i],
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: i == index ? Colors.white : AppTheme.slate500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    CountBadge(counts[i]),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Seletor no formato do `Select` do shadcn ("Todos os status").
class SelectField<T> extends StatelessWidget {
  const SelectField({
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
      dropdownColor: Colors.white,
      borderRadius: BorderRadius.circular(6),
      style: const TextStyle(fontSize: 14, color: AppTheme.slate950),
      decoration: InputDecoration(
        fillColor: Colors.white.withValues(alpha: 0.8),
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

/// Campo com rótulo acima e dica, o formato padrão dos formulários do PWA.
class FormInput extends StatelessWidget {
  const FormInput({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.helper,
    this.keyboardType,
    this.maxLines = 1,
    this.validator,
    this.onChanged,
    this.enabled = true,
    this.capitalization = TextCapitalization.none,
    this.suffix,
    this.prefixIcon,
    this.autofillHints,
    this.textInputAction,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final String? helper;
  final TextInputType? keyboardType;
  final int maxLines;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final TextCapitalization capitalization;
  final Widget? suffix;
  final IconData? prefixIcon;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      helper: helper,
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        keyboardType: keyboardType,
        maxLines: maxLines,
        validator: validator,
        onChanged: onChanged,
        textCapitalization: capitalization,
        autofillHints: autofillHints,
        textInputAction: textInputAction,
        decoration: InputDecoration(
          hintText: hint,
          suffixIcon: suffix,
          prefixIcon: prefixIcon == null ? null : Icon(prefixIcon, size: 16),
        ),
      ),
    );
  }
}

/// Selo com ícone (`Badge` + ícone 12 do PWA), nas cores 100/800 do Tailwind.
class IconChip extends StatelessWidget {
  const IconChip(
    this.label, {
    super.key,
    required this.icon,
    required this.background,
    required this.foreground,
  });

  /// Cinza, azul, verde e vermelho dos status de revisão.
  const IconChip.gray(this.label, {super.key, required this.icon})
      : background = const Color(0xFFF3F4F6),
        foreground = const Color(0xFF1F2937);
  const IconChip.blue(this.label, {super.key, required this.icon})
      : background = const Color(0xFFDBEAFE),
        foreground = const Color(0xFF1E40AF);
  const IconChip.green(this.label, {super.key, required this.icon})
      : background = const Color(0xFFDCFCE7),
        foreground = const Color(0xFF166534);
  const IconChip.red(this.label, {super.key, required this.icon})
      : background = const Color(0xFFFEE2E2),
        foreground = const Color(0xFF991B1B);

  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: foreground),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              height: 1.5,
              color: foreground,
            ),
          ),
        ],
      ),
    );
  }
}

/// Selo de status da revisão, igual ao `RevisionCard` do PWA.
Widget revisionStatusChip(String status) => switch (status) {
      'IN_PROGRESS' =>
        const IconChip.blue('Em Andamento', icon: LucideIcons.clock),
      'COMPLETED' =>
        const IconChip.green('Concluída', icon: LucideIcons.circleCheck),
      'CANCELLED' => const IconChip.red('Cancelada', icon: LucideIcons.circleX),
      _ => const IconChip.gray('Rascunho', icon: LucideIcons.circle),
    };
