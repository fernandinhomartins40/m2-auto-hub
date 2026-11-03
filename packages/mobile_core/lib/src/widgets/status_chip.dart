import 'package:flutter/material.dart';

enum StatusTone { neutral, info, success, warning, danger, orange, purple, dark }

/// Selo de status (`Badge` do PWA): pílula com fundo 100 e texto 800 do
/// Tailwind. `dark` é o selo preto da placa. A cor acompanha o texto, nunca
/// o substitui.
class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.tone = StatusTone.neutral});

  final String label;
  final StatusTone tone;

  static const _colors = {
    StatusTone.neutral: (Color(0xFFF3F4F6), Color(0xFF1F2937)),
    StatusTone.info: (Color(0xFFDBEAFE), Color(0xFF1E40AF)),
    StatusTone.success: (Color(0xFFDCFCE7), Color(0xFF166534)),
    StatusTone.warning: (Color(0xFFFEF9C3), Color(0xFF854D0E)),
    StatusTone.danger: (Color(0xFFFEE2E2), Color(0xFF991B1B)),
    StatusTone.orange: (Color(0xFFFFEDD5), Color(0xFF9A3412)),
    StatusTone.purple: (Color(0xFFF3E8FF), Color(0xFF6B21A8)),
    StatusTone.dark: (Color(0xFF020617), Colors.white),
  };

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = _colors[tone]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          height: 1.5,
        ),
      ),
    );
  }
}
