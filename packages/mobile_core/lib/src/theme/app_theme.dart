import 'package:flutter/material.dart';

/// Tema dos apps, copiado dos tokens do PWA (`apps/frontend/src/index.css`).
///
/// Os nomes seguem as variáveis CSS para facilitar a conferência: `primary` é
/// `--primary` (217 94% 53%), `ink` é `--panel-ink` e assim por diante.
class AppTheme {
  AppTheme._();

  static const String bodyFont = 'packages/m2_core/Inter';
  static const String headingFont = 'packages/m2_core/Rajdhani';

  static const Color primary = Color(0xFF166DF8);
  static const Color primaryHover = Color(0xFF0760ED);
  static const Color foreground = Color(0xFF020817);
  static const Color ink = Color(0xFF0F1729);

  /// slate-950, usado em títulos de cartão e no selo da placa.
  static const Color slate950 = Color(0xFF020617);
  static const Color slate500 = Color(0xFF64748B);
  static const Color mutedForeground = Color(0xFF6B7280);
  static const Color border = Color(0xFFD4D7DE);
  static const Color muted = Color(0xFFE2E4E9);
  static const Color destructive = Color(0xFFEF4343);

  /// Fundo dos campos no painel (gray-50 sobre o vidro).
  static const Color inputFill = Color(0xFFF5F6F8);

  /// Cor das telas de marca, a mesma `themeColor` padrão dos PWAs.
  static const Color brandDark = Color(0xFF0F172A);

  // Tons dos selos e números coloridos (Tailwind 600/700).
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFCA8A04);
  static const Color danger = Color(0xFFDC2626);
  static const Color orange = Color(0xFFEA580C);
  static const Color purple = Color(0xFF9333EA);

  // Tons do fundo líquido.
  static const Color tintBlue = Color(0xFF4D9DFF);
  static const Color tintOrange = Color(0xFFFF8E42);
  static const Color tintGreen = Color(0xFF45DE94);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      onPrimary: Colors.white,
      secondary: slate950,
      onSecondary: Colors.white,
      error: destructive,
      surface: Colors.white,
      onSurface: foreground,
      onSurfaceVariant: mutedForeground,
      outline: border,
      outlineVariant: border,
    );
    const radius = BorderRadius.all(Radius.circular(6));
    const shape = RoundedRectangleBorder(borderRadius: radius);
    final text = _textTheme();
    const buttonText = TextStyle(
      fontFamily: bodyFont,
      fontSize: 14,
      fontWeight: FontWeight.w500,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: bodyFont,
      textTheme: text,
      scaffoldBackgroundColor: const Color(0xFFF8FAFB),
      splashFactory: InkRipple.splashFactory,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: Colors.white.withValues(alpha: 0.85),
        surfaceTintColor: Colors.transparent,
        foregroundColor: slate950,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: text.titleLarge,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: Colors.white.withValues(alpha: 0.72),
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
        ),
      ),
      dividerTheme: const DividerThemeData(color: border, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputFill,
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        hintStyle: const TextStyle(color: mutedForeground, fontSize: 14),
        labelStyle: const TextStyle(color: mutedForeground, fontSize: 14),
        floatingLabelStyle: const TextStyle(color: primary),
        prefixIconColor: mutedForeground,
        suffixIconColor: mutedForeground,
        prefixIconConstraints:
            const BoxConstraints(minWidth: 40, minHeight: 40),
        border: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: border.withValues(alpha: 0.7)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: border.withValues(alpha: 0.7)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: primary, width: 2),
        ),
        errorBorder: const OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: destructive),
        ),
        focusedErrorBorder: const OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: destructive, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 40),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          backgroundColor: primary,
          foregroundColor: Colors.white,
          textStyle: buttonText,
          shape: shape,
          iconSize: 16,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(64, 40),
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          textStyle: buttonText,
          shape: shape,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(64, 40),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          foregroundColor: primary,
          backgroundColor: Colors.white.withValues(alpha: 0.6),
          side: const BorderSide(color: primary),
          textStyle: buttonText,
          shape: shape,
          iconSize: 16,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: buttonText,
          shape: shape,
        ),
      ),
      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        side: BorderSide(color: border.withValues(alpha: 0.8)),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
        side: const BorderSide(color: primary),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 2,
        shape: shape,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: text.titleLarge,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: slate500,
        titleTextStyle: TextStyle(
          fontFamily: bodyFont,
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: slate950,
        ),
        subtitleTextStyle: TextStyle(
          fontFamily: bodyFont,
          fontSize: 13,
          color: mutedForeground,
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: primary),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: slate950,
      ),
    );
  }

  /// Títulos em Rajdhani bold (`h1..h6` do PWA), texto corrido em Inter.
  static TextTheme _textTheme() {
    TextStyle heading(double size) => TextStyle(
          fontFamily: headingFont,
          fontSize: size,
          fontWeight: FontWeight.w700,
          height: 1.15,
          letterSpacing: -0.2,
          color: slate950,
        );
    TextStyle body(double size, [FontWeight weight = FontWeight.w400]) =>
        TextStyle(
          fontFamily: bodyFont,
          fontSize: size,
          fontWeight: weight,
          height: 1.45,
          color: foreground,
        );
    return TextTheme(
      displaySmall: heading(30),
      headlineMedium: heading(26),
      headlineSmall: heading(24),
      titleLarge: heading(20),
      titleMedium: heading(18),
      titleSmall: body(14, FontWeight.w600),
      bodyLarge: body(16),
      bodyMedium: body(14),
      bodySmall: body(12).copyWith(color: mutedForeground),
      labelLarge: body(14, FontWeight.w500),
      labelMedium: body(12, FontWeight.w500),
      labelSmall: body(11, FontWeight.w500),
    );
  }
}
