import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Peças visuais do painel do PWA (`.panel-shell`, `.panel-surface`,
/// `PanelPageHeader`, `PanelWorkspaceTabs`, `PanelBrand`, `BottomNavigation`).
///
/// Cada widget cita a classe CSS de onde saíram as medidas, para que uma
/// mudança no site possa ser repetida aqui.

/// Fundo do painel: gradiente claro com manchas azul, laranja e verde.
///
/// `login` usa a variação `.liquid-login`, mais saturada, das telas de entrada.
class LiquidBackground extends StatelessWidget {
  const LiquidBackground({super.key, required this.child, this.login = false});

  final Widget child;
  final bool login;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _LiquidPainter(login: login),
      child: child,
    );
  }
}

class _LiquidPainter extends CustomPainter {
  const _LiquidPainter({required this.login});

  final bool login;

  // 1rem do CSS em pixels lógicos.
  static const double _rem = 16;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    // linear-gradient(145deg, ...): de cima-esquerda para baixo-direita.
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: const Alignment(-0.57, -1),
          end: const Alignment(0.57, 1),
          colors: login
              ? const [Color(0xFFE6EAF0), Color(0xFFF8FAFC)]
              : const [Color(0xFFECEFF3), Color(0xFFF8FAFB)],
        ).createShader(rect),
    );
    void spot(double x, double y, Color color, double alpha, double radius) {
      final center = Offset(size.width * x, size.height * y);
      canvas.drawRect(
        rect,
        Paint()
          ..shader = ui.Gradient.radial(
            center,
            radius * _rem,
            [color.withValues(alpha: alpha), color.withValues(alpha: 0)],
          ),
      );
    }

    if (login) {
      spot(0.08, 0.12, AppTheme.tintBlue, 0.34, 28);
      spot(0.92, 0.82, AppTheme.tintOrange, 0.26, 30);
      spot(0.75, 0.02, AppTheme.tintGreen, 0.13, 22);
    } else {
      spot(0.07, 0.04, AppTheme.tintBlue, 0.22, 26);
      spot(0.94, 0.32, AppTheme.tintOrange, 0.16, 28);
      spot(0.45, 1.05, AppTheme.tintGreen, 0.12, 32);
    }
  }

  @override
  bool shouldRepaint(_LiquidPainter oldDelegate) => oldDelegate.login != login;
}

/// `Scaffold` transparente sobre o fundo líquido. Cada rota pinta o próprio
/// fundo, então a transição entre telas não mostra uma por baixo da outra.
class PanelScaffold extends StatelessWidget {
  const PanelScaffold({
    super.key,
    this.appBar,
    required this.body,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.login = false,
    this.extendBody = false,
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final bool login;
  final bool extendBody;

  @override
  Widget build(BuildContext context) {
    return LiquidBackground(
      login: login,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: appBar,
        body: body,
        extendBody: extendBody,
        bottomNavigationBar: bottomNavigationBar,
        floatingActionButton: floatingActionButton,
      ),
    );
  }
}

/// Vidro do painel (`.panel-surface`): branco translúcido, borda clara e
/// sombra longa e suave.
BoxDecoration glassDecoration({
  double radius = 16,
  double opacity = 0.72,
}) {
  return BoxDecoration(
    gradient: LinearGradient(
      begin: const Alignment(-0.57, -1),
      end: const Alignment(0.57, 1),
      colors: [
        Colors.white.withValues(alpha: (opacity + 0.08).clamp(0, 1)),
        Colors.white.withValues(alpha: (opacity - 0.2).clamp(0, 1)),
      ],
    ),
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
    boxShadow: [
      BoxShadow(
        color: AppTheme.ink.withValues(alpha: 0.34),
        offset: const Offset(0, 18),
        blurRadius: 50,
        spreadRadius: -30,
      ),
    ],
  );
}

/// Cartão de vidro. `accent` desenha a barra azul da esquerda, como no
/// cabeçalho de seção do PWA.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.accent = false,
    this.radius = 16,
    this.color,
    this.borderColor,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final bool accent;
  final double radius;

  /// Fundo sólido no lugar do vidro (cartões de alerta, por exemplo).
  final Color? color;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(radius);
    var decoration = glassDecoration(radius: radius);
    if (color != null || borderColor != null) {
      decoration = decoration.copyWith(
        gradient: color != null ? null : decoration.gradient,
        color: color,
        border: Border.all(
          color: borderColor ?? Colors.white.withValues(alpha: 0.8),
        ),
      );
    }
    Widget content = Padding(padding: padding, child: child);
    if (accent) {
      content = Stack(
        children: [
          content,
          const Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            child: SizedBox(
              width: 4,
              child: ColoredBox(color: AppTheme.primary),
            ),
          ),
        ],
      );
    }
    return DecoratedBox(
      decoration: decoration,
      child: ClipRRect(
        borderRadius: shape,
        child: Material(
          type: MaterialType.transparency,
          child: onTap == null
              ? content
              : InkWell(onTap: onTap, borderRadius: shape, child: content),
        ),
      ),
    );
  }
}

/// Selo "M2" + sobretítulo azul + título (`PanelBrand`).
class PanelBrand extends StatelessWidget {
  const PanelBrand({super.key, required this.eyebrow, required this.title});

  final String eyebrow;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const BrandMark(),
        const SizedBox(width: 12),
        Flexible(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                eyebrow.toUpperCase(),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: AppTheme.bodyFont,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2.4,
                  color: AppTheme.primary,
                  height: 1.4,
                ),
              ),
              Text(
                title,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: AppTheme.bodyFont,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  height: 1.25,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Quadrado azul com "M2" (`.panel-brand-mark`).
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(size * 0.3),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.85),
            offset: const Offset(0, 10),
            blurRadius: 24,
            spreadRadius: -10,
          ),
        ],
      ),
      child: Text(
        'M2',
        style: TextStyle(
          fontFamily: AppTheme.bodyFont,
          fontSize: size * 0.3,
          fontWeight: FontWeight.w900,
          letterSpacing: size * 0.042,
          color: Colors.white,
        ),
      ),
    );
  }
}

/// Faixa de vidro do topo e da navegação inferior
/// (`.panel-shell > header`, `nav.fixed`).
BoxDecoration frostedBarDecoration({bool top = true}) {
  final rim = Colors.white.withValues(alpha: 0.65);
  return BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Colors.white.withValues(alpha: 0.86),
        Colors.white.withValues(alpha: 0.7),
      ],
    ),
    border: top
        ? Border(bottom: BorderSide(color: rim))
        : Border(top: BorderSide(color: rim)),
    boxShadow: [
      BoxShadow(
        color: AppTheme.ink.withValues(alpha: 0.5),
        offset: Offset(0, top ? 12 : -12),
        blurRadius: 34,
        spreadRadius: -26,
      ),
    ],
  );
}

class _FrostedBar extends StatelessWidget {
  const _FrostedBar({required this.child, this.top = true});

  final Widget child;
  final bool top;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 22, sigmaY: 22),
        child: DecoratedBox(
          decoration: frostedBarDecoration(top: top),
          child: child,
        ),
      ),
    );
  }
}

/// Cabeçalho das abas principais: marca à esquerda, ações à direita.
class PanelHeaderBar extends StatelessWidget implements PreferredSizeWidget {
  const PanelHeaderBar({
    super.key,
    required this.eyebrow,
    required this.title,
    this.actions = const [],
  });

  final String eyebrow;
  final String title;
  final List<Widget> actions;

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return _FrostedBar(
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 64,
          child: Padding(
            padding: const EdgeInsets.only(left: 16, right: 8),
            child: Row(
              children: [
                Expanded(child: PanelBrand(eyebrow: eyebrow, title: title)),
                ...actions,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Barra das telas internas: voltar, título em Rajdhani e ações.
class PanelAppBar extends StatelessWidget implements PreferredSizeWidget {
  const PanelAppBar({
    super.key,
    required this.title,
    this.actions = const [],
    this.bottom,
  });

  final String title;
  final List<Widget> actions;
  final PreferredSizeWidget? bottom;

  @override
  Size get preferredSize =>
      Size.fromHeight(60 + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    return _FrostedBar(
      child: AppBar(
        backgroundColor: Colors.transparent,
        toolbarHeight: 60,
        titleSpacing: 4,
        title: Text(title),
        actions: [...actions, const SizedBox(width: 4)],
        bottom: bottom,
      ),
    );
  }
}

/// Cabeçalho de seção (`PanelPageHeader`): barra azul, ícone num quadrado
/// azul claro, título, descrição e ações empilhadas embaixo.
class PanelPageHeader extends StatelessWidget {
  const PanelPageHeader({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.actions = const [],
    this.badge,
  });

  final IconData icon;
  final String title;
  final String description;
  final List<Widget> actions;
  final Widget? badge;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      accent: true,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (badge != null) ...[
            Align(alignment: Alignment.centerLeft, child: badge!),
            const SizedBox(height: 8),
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconTile(icon: icon),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontFamily: AppTheme.headingFont,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                        color: AppTheme.slate950,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.6,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          for (final action in actions) ...[
            const SizedBox(height: 8),
            action,
          ],
        ],
      ),
    );
  }
}

/// Ícone dentro de um quadrado azul claro (`bg-primary/10 ring-primary/15`).
class IconTile extends StatelessWidget {
  const IconTile({
    super.key,
    required this.icon,
    this.color = AppTheme.primary,
    this.size = 44,
    this.filled = false,
  });

  final IconData icon;
  final Color color;
  final double size;

  /// Fundo cheio e ícone branco, como nos atalhos do início do cliente.
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: filled
            ? null
            : Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Icon(
        icon,
        size: size * 0.45,
        color: filled ? Colors.white : color,
      ),
    );
  }
}

/// Uma aba de [WorkspaceTabs].
class WorkspaceTab {
  const WorkspaceTab(this.label, {this.icon});

  final String label;
  final IconData? icon;
}

/// Abas em pílula (`PanelWorkspaceTabs` / `.app-tabs-list`): a ativa fica
/// azul e cheia. `expand` divide a largura igualmente entre as abas.
class WorkspaceTabs extends StatelessWidget {
  const WorkspaceTabs({
    super.key,
    required this.tabs,
    required this.index,
    required this.onChanged,
    this.expand = false,
  });

  final List<WorkspaceTab> tabs;
  final int index;
  final ValueChanged<int> onChanged;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final buttons = [
      for (var i = 0; i < tabs.length; i++)
        _TabButton(
          tab: tabs[i],
          active: i == index,
          compact: expand,
          onTap: () => onChanged(i),
        ),
    ];
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: glassDecoration(opacity: 0.62),
      child: expand
          ? Row(
              children: [
                for (var i = 0; i < buttons.length; i++) ...[
                  if (i > 0) const SizedBox(width: 4),
                  Expanded(child: buttons[i]),
                ],
              ],
            )
          : SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (var i = 0; i < buttons.length; i++) ...[
                    if (i > 0) const SizedBox(width: 4),
                    buttons[i],
                  ],
                ],
              ),
            ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.tab,
    required this.active,
    required this.onTap,
    this.compact = false,
  });

  final WorkspaceTab tab;
  final bool active;
  final VoidCallback onTap;

  /// Abas que dividem a largura: menos respiro lateral para o rótulo caber.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = active ? Colors.white : AppTheme.slate500;
    return Semantics(
      selected: active,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          constraints: const BoxConstraints(minHeight: 40),
          padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: active
                ? LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppTheme.primary.withValues(alpha: 0.92),
                      AppTheme.primaryHover.withValues(alpha: 0.98),
                    ],
                  )
                : null,
            boxShadow: active
                ? [
                    BoxShadow(
                      color: AppTheme.primary.withValues(alpha: 0.8),
                      offset: const Offset(0, 9),
                      blurRadius: 20,
                      spreadRadius: -12,
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (tab.icon != null) ...[
                Icon(tab.icon, size: 16, color: color),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  tab.label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Número de resumo: rótulo, valor grande e legenda. `iconColor` pinta o
/// ícone do canto, como nos cartões do suporte e do trabalho do mecânico.
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.caption,
    this.icon,
    this.iconColor = AppTheme.primary,
    this.valueColor = AppTheme.slate950,
  });

  final String label;
  final String value;
  final String? caption;
  final IconData? icon;
  final Color iconColor;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF374151),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    height: 1.1,
                    color: valueColor,
                  ),
                ),
                if (caption != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    caption!,
                    style: const TextStyle(
                      fontSize: 11,
                      height: 1.35,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (icon != null) Icon(icon, size: 18, color: iconColor),
        ],
      ),
    );
  }
}

/// Grade de duas colunas para [StatTile] e cartões curtos.
class TwoColumnGrid extends StatelessWidget {
  const TwoColumnGrid({super.key, required this.children, this.gap = 12});

  final List<Widget> children;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i += 2) {
      if (i > 0) rows.add(SizedBox(height: gap));
      rows.add(
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: children[i]),
              SizedBox(width: gap),
              Expanded(
                child: i + 1 < children.length
                    ? children[i + 1]
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      );
    }
    return Column(children: rows);
  }
}

/// Rótulo acima do campo (`Label` do shadcn: 14, medium).
class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.child,
    this.helper,
  });

  final String label;
  final Widget child;
  final String? helper;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppTheme.slate950,
            height: 1,
          ),
        ),
        const SizedBox(height: 8),
        child,
        if (helper != null) ...[
          const SizedBox(height: 6),
          Text(
            helper!,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground,
            ),
          ),
        ],
      ],
    );
  }
}

/// Item da navegação inferior.
class PanelNavItem {
  const PanelNavItem(this.label, this.icon, {this.badge = 0});

  final String label;
  final IconData icon;
  final int badge;
}

/// Navegação inferior de vidro (`BottomNavigation`): ícone 20, rótulo 12,
/// ativo em azul e semibold.
class PanelBottomNav extends StatelessWidget {
  const PanelBottomNav({
    super.key,
    required this.items,
    required this.index,
    required this.onTap,
  });

  final List<PanelNavItem> items;

  /// -1 quando nenhum item está ativo (por exemplo, o "Mais").
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return _FrostedBar(
      top: false,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              for (var i = 0; i < items.length; i++)
                Expanded(child: _navButton(items[i], i == index, () => onTap(i))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navButton(PanelNavItem item, bool active, VoidCallback onTap) {
    final color = active ? AppTheme.primary : const Color(0xFF6B7280);
    Widget icon = Icon(item.icon, size: 20, color: color);
    if (item.badge > 0) {
      icon = Badge(
        label: Text('${item.badge}'),
        backgroundColor: AppTheme.primary,
        child: icon,
      );
    }
    return Semantics(
      selected: active,
      button: true,
      label: item.label,
      excludeSemantics: true,
      child: InkResponse(
        onTap: onTap,
        containedInkWell: true,
        highlightShape: BoxShape.rectangle,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon,
            const SizedBox(height: 4),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
